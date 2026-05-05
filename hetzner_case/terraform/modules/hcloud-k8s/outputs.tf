output "control_plane_ips" {
  value = hcloud_server.control_plane[*].ipv4_address
}

output "worker_ips" {
  value = hcloud_server.workers[*].ipv4_address
}

output "storage_worker_ips" {
  value = hcloud_server.storage_workers[*].ipv4_address
}

output "first_control_plane_ip" {
  value       = hcloud_server.control_plane[0].ipv4_address
  description = "Public IP of the first control plane node (for kubeconfig)"
}

