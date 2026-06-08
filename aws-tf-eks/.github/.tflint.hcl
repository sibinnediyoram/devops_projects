plugin "aws" {
  source = "github.com/terraform-linters/tflint-ruleset-aws"
  version = "0.30.0"
}

rule "aws_instance_valid_ami" {
  enabled = true
}

rule "aws_s3_bucket_require_ssl" {
  enabled = true
}

rule "aws_elb_valid_protocol" {
  enabled = true
}