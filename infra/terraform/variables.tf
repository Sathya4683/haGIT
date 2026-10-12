variable "region" {
  description = "AWS region for the monitoring host."
  type        = string
  default     = "ap-south-1"
}

variable "instance_type" {
  description = "Free-tier eligible type. t3.micro (1 GB) runs the stack with swap; t3.small (2 GB) gives headroom."
  type        = string
  default     = "t3.micro"
}

variable "root_volume_gb" {
  description = "Root EBS volume size (gp3). Prometheus and Loki keep ~2 weeks of data."
  type        = number
  default     = 20
}

variable "ssh_public_key_path" {
  description = "Public key installed for the ubuntu user."
  type        = string
  default     = "~/.ssh/id_ed25519.pub"
}

variable "ssh_allowed_cidr" {
  description = "CIDR allowed to SSH in (your IP as x.x.x.x/32). HTTP/HTTPS are open to everyone."
  type        = string
}

variable "budget_limit_usd" {
  description = "Monthly cost budget for the account; 0 disables the budget."
  type        = number
  default     = 15
}

variable "budget_alert_email" {
  description = "Where budget alerts are sent (required when budget_limit_usd > 0)."
  type        = string
  default     = ""
}
