output "network_id" {
  value = hcloud_network.main.id
}

output "control_plane_subnet_id" {
  value = hcloud_network_subnet.control_plane.id
}

output "worker_subnet_id" {
  value = hcloud_network_subnet.workers.id
}

output "storage_subnet_id" {
  value = hcloud_network_subnet.storage.id
}

output "firewall_nodes_id" {
  value = hcloud_firewall.nodes.id
}

output "firewall_lb_id" {
  value = hcloud_firewall.load_balancer.id
}
