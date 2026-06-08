output "role_arn" {
  description = "ARN of the IAM role for the ALB controller"
  value       = aws_iam_role.alb_controller.arn
}
