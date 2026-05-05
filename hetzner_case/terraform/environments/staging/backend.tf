terraform {
  #Use Hetzner Object Storage or Terraform Cloud for remote state
  backend "s3" {
    bucket                      = "hetzner_demo-stg-terraform-state"
    key                         = "staging/terraform.tfstate"
    region                      = "eu-central-1"
    endpoint                    = "https://nbg1.your-objectstorage.com"
    skip_credentials_validation = true
    skip_metadata_api_check     = true
    skip_region_validation      = true
    force_path_style            = true
  }
}