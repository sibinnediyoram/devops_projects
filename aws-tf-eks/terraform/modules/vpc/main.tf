# This module creates a VPC with public and private subnets, an Internet Gateway, NAT Gateways, and associated route tables.
locals {
  # Keyed by AZ so for_each produces stable resource addresses.
  # Reordering or removing an AZ only affects that subnet, not all subnets.
  public_subnet_map  = { for s in var.public_subnets : s.az => s }
  private_subnet_map = { for s in var.private_subnets : s.az => s }

  # single_nat_gateway=true saves cost in non-prod by sharing one NAT GW.
  # In prod, one per AZ avoids cross-AZ data transfer charges and the single point of failure.
  nat_subnet_map = { for s in(var.single_nat_gateway ? slice(var.public_subnets, 0, 1) : var.public_subnets) : s.az => s }
}

resource "aws_vpc" "this" {
  cidr_block           = var.vpc_cidr
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = merge(var.tags, {
    Name = var.name
  })
}

resource "aws_internet_gateway" "this" {
  vpc_id = aws_vpc.this.id

  tags = merge(var.tags, {
    Name = "${var.name}-igw"
  })
}

resource "aws_subnet" "public" {
  for_each = local.public_subnet_map

  vpc_id                  = aws_vpc.this.id
  cidr_block              = each.value.cidr
  availability_zone       = each.key
  map_public_ip_on_launch = true

  tags = merge(var.tags, {
    Name = "${var.name}-public-${each.key}"
    # Required by the AWS Load Balancer Controller to discover public subnets for internet-facing ALBs.
    "kubernetes.io/role/elb"                    = "1"
    "kubernetes.io/cluster/${var.cluster_name}" = "owned"
  })
}

resource "aws_subnet" "private" {
  for_each = local.private_subnet_map

  vpc_id            = aws_vpc.this.id
  cidr_block        = each.value.cidr
  availability_zone = each.key

  tags = merge(var.tags, {
    Name = "${var.name}-private-${each.key}"
    # Required by the AWS Load Balancer Controller to discover private subnets for internal ALBs.
    "kubernetes.io/role/internal-elb"           = "1"
    "kubernetes.io/cluster/${var.cluster_name}" = "owned"
  })
}

resource "aws_eip" "nat" {
  for_each = local.nat_subnet_map
  domain   = "vpc"

  tags = merge(var.tags, {
    Name = "${var.name}-nat-${each.key}"
  })
}

resource "aws_nat_gateway" "this" {
  for_each = local.nat_subnet_map

  allocation_id = aws_eip.nat[each.key].id
  subnet_id     = aws_subnet.public[each.key].id

  tags = merge(var.tags, {
    Name = "${var.name}-nat-${each.key}"
  })

  depends_on = [aws_internet_gateway.this]
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.this.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.this.id
  }

  tags = merge(var.tags, {
    Name = "${var.name}-public"
  })
}

resource "aws_route_table_association" "public" {
  for_each = local.public_subnet_map

  subnet_id      = aws_subnet.public[each.key].id
  route_table_id = aws_route_table.public.id
}

resource "aws_route_table" "private" {
  for_each = local.nat_subnet_map
  vpc_id   = aws_vpc.this.id

  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.this[each.key].id
  }

  tags = merge(var.tags, {
    Name = "${var.name}-private-${each.key}"
  })
}

resource "aws_route_table_association" "private" {
  for_each = local.private_subnet_map

  subnet_id = aws_subnet.private[each.key].id
  route_table_id = aws_route_table.private[var.single_nat_gateway ? var.public_subnets[0].az : each.key].id
}
