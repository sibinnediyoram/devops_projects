resource "hcloud_load_balancer" "ingress" {
  name               = "${var.cluster_name}-ingress-lb"
  load_balancer_type = var.lb_type
  location           = var.location

  labels = {
    managed-by  = "terraform"
    cluster     = var.cluster_name
    environment = var.environment
  }
}

resource "hcloud_load_balancer_network" "ingress" {
  load_balancer_id = hcloud_load_balancer.ingress.id
  network_id       = var.network_id
}

resource "hcloud_load_balancer_service" "https" {
  load_balancer_id = hcloud_load_balancer.ingress.id
  protocol         = "tcp"
  listen_port      = 443
  destination_port = 443

  health_check {
    protocol = "tcp"
    port     = 443
    interval = 10
    timeout  = 5
    retries  = 3
  }
}

resource "hcloud_load_balancer_service" "http" {
  load_balancer_id = hcloud_load_balancer.ingress.id
  protocol         = "tcp"
  listen_port      = 80
  destination_port = 80

  health_check {
    protocol = "tcp"
    port     = 80
    interval = 10
    timeout  = 5
    retries  = 3
  }
}

# Route ingress traffic to general-pool worker nodes only (Hetzner label: role=worker).
# Storage-pool nodes (role=storage-worker) are excluded — they host Elasticsearch and
# have limited spare capacity. Traefik MUST be scheduled on general-pool nodes to match
# this target; configure Traefik Helm values with:
#   nodeSelector: { "node.imago.io/pool": "general" }
resource "hcloud_load_balancer_target" "workers" {
  type             = "label_selector"
  load_balancer_id = hcloud_load_balancer.ingress.id
  label_selector   = "role=worker"   # matches hcloud_server.workers Hetzner labels
  use_private_ip   = true

  depends_on = [hcloud_load_balancer_network.ingress]
}
