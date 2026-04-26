terraform {
  #Use Hetzner Object Storage or Terraform Cloud for remote state
  backend "s3" {
    bucket                      = "imago-prod-terraform-state"
    key                         = "production/terraform.tfstate"
    region                      = "eu-central-1"
    endpoint                    = "https://nbg1.your-objectstorage.com"
    skip_credentials_validation = true
    skip_metadata_api_check     = true
    skip_region_validation      = true
    force_path_style            = true
  }
}