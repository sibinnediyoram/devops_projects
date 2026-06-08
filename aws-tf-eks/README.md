# Take-Home Exercise for DevOps candidates

## Intro

Welcome to the example.markets Take-Home Exercise!

First off, thank you for taking the time to work through this exercise.
We’re excited to see how you approach the challenge!

There’s no one "right" way to solve the tasks here.
We’re more interested in understanding your thought process, how you break down problems,
and how you approach writing clean, maintainable code.

You received this exercise as a Git repository in a ZIP archive.
Please, submit your solution as Git commits to this repository, then return it back to us in a ZIP archive.
Make sure that the resulting archive does not contain any caches or dependencies,
regardless of whether those are Git-ignored or not.

Feel free to mimic your natural workflow as much as possible.
We encourage you to submit incremental commits as you make progress.
Don’t hesitate to leave comments in the code explaining your assumptions, decisions, and any trade-offs you made.
This is all about transparency and collaboration, even in a take-home exercise.

We’re looking forward to seeing your solutions and how you work through the problem!

Good luck and have fun!

## The Task

This repository contains code of a simple API service in Python with three endpoints:
`/hello`, `/ready` and `/alive`, as well as a basic `Dockerfile` necessary to run the code in a container.

Pay attention to availability, reliability, security, and overall quality of the every aspect of the proposed solution.
We are intentionally not providing any specific requirements, and are relying on your experience and knowledge
of Kubernetes, Terraform and platform engineering best practices to deliver the solution.

Note that some parts of the setup can be improved –
feel free to correct if you encounter mistakes or inconsistencies.

Depending on your level of experience, this exercise is expected to take around three hours.
We value your time, so if you're unable to complete everything, that's perfectly fine —
please provide a brief explanation in the part #3 of the task,
detailing what was left incomplete and any challenges you encountered.

### Part 1: Kubernetes manifests

* Prepare Kubernetes manifests necessary to run the API service in a Kubernetes cluster (version >= 1.30).

* Please make sure that the components necessary for exposing the API service outside the Kubernetes cluster 
are included in the manifests.

* Note that the manifests should be reusable, so that the API service can be deployed in multiple
environments (e.g. development, staging, production).

### Part 2: Terraform configuration

* Prepare Terraform configuration necessary to provision an EKS cluster in AWS, with all necessary components,
so we can deploy the API service with the Kubernetes manifests from part #1 of your submission in it.

* Please make sure that the cloud resources necessary for exposing the API service outside the Kubernetes cluster
are included in the configuration.

* Note that the configuration should be reusable, so that the cloud resources for the API service
can be provisioned in multiple environments (e.g. development, staging, production).

### Part 3: Wrap-up & documentation

* Add a file called `SOLUTION.md` and describe the solution you have implemented in parts #1 and #2.

* Include the reasoning behind the decisions you made, and any trade-offs you had to make.

* Include any assumptions you made during the implementation.

* Include any improvements you would make if you had more time, necessary for such a solution to be production ready.

## Code quality

In order to keep a certain amount of code quality we are using pre-commit hooks
in this repository, which are installed by a 3rd-party tool called [pre-commit](https://pre-commit.com/).

Please follow [this documentation](https://pre-commit.com/#install) to install `pre-commit`
on your local machine. After that just execute the following command to install the hooks
to your git folder:

```shell
pre-commit install
```
