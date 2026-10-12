locals {
  domain = "hagit-${replace(aws_eip.this.public_ip, ".", "-")}.sslip.io"
}

output "public_ip" {
  value = aws_eip.this.public_ip
}

output "domain" {
  description = "Hostname for Caddy/Grafana (resolves to the Elastic IP via sslip.io)."
  value       = local.domain
}

output "grafana_url" {
  value = "https://${local.domain}"
}

output "loki_push_url" {
  description = "LOKI_URL for the app (Vercel)."
  value       = "https://${local.domain}/loki/api/v1/push"
}

output "ssh" {
  value = "ssh ubuntu@${aws_eip.this.public_ip}"
}
