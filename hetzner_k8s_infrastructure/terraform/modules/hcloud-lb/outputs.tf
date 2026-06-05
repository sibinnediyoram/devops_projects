output "lb_id" {
  value = hcloud_load_balancer.ingress.id
}

output "lb_public_ip" {
  value = hcloud_load_balancer.ingress.ipv4
}
