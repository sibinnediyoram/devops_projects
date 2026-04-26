Context
IMAGO operates a large-scale media platform used by editorial, sports, broadcast, and enterprise customers. We are continuing to modernize our infrastructure while balancing current operational realities:
parts of the infrastructure are still manually maintained
some internal and legacy systems still rely on Windows
newer services should move toward a Linux-centric, automated, Infrastructure-as-Code-driven model
reliability, observability, and secure operations are critical
the platform runs across a mix of Hetzner bare metal and Hetzner cloud
engineering teams need better support for automated deployments and repeatable environments
Scenario
IMAGO is preparing a new infrastructure setup for our business-critical media delivery. The domain consists of multiple services:
IMAGO Web App used by internal and external users
Media Search Service used by the IMAGO Web App to search media and deliver the results to clients (integrates an ElasticSearch)
Media Download Service responsible for secure delivery of media assets
These services are expected to evolve independently over time. The new setup should reflect the direction we want to move toward as a company:
Infrastructure as Code as the default approach
repeatable and automated provisioning
support for modern deployment workflows
clear observability and operational visibility
pragmatic handling of hybrid reality, including legacy/manual systems and some Windows-based environments
You may assume this platform will run on a mix of:
Hetzner bare metal
Hetzner cloud
Linux-based workloads as the default target platform
Some requirements are intentionally left open. We want you to make reasonable assumptions and design a solution that you believe would work well for this situation.
Your Task
Design the architecture and provide structural code/configurations for the target infrastructure.
Your submission should combine:
Architecture / platform design
An IaC-focused concept
A short operational strategy for running and evolving the platform
The goal is not to build every component fully, but to demonstrate how you think and how you would approach the problem in a senior role.
What we would like to see
Please cover the following areas.
Priority 1: Architecture and platform decisions
Infrastructure as Code concept
Observability and Monitoring Strategy
Priority 2: Migration
How you would introduce IaC into an environment that still contains manually maintained infrastructure
How you would deal with Linux and Windows coexistence during a transition
What you would prioritize first if you joined and had to improve the current setup incrementally
Where you would accept temporary compromises and where you would push for standardization
Priority 3: CI/CD and delivery approach of the infrastructure
Constraints
Please keep the following in mind:
This is a 6 hour exercise, so scope your implementation accordingly.
We do not expect a complete production platform.
You do not need to implement business logic for the application itself.
You may make assumptions about traffic patterns, availability needs, environments, and service boundaries, as long as you document them.
You may use AI tools, but your submission should clearly reflect your own judgment and decision-making.
Deliverables
Keep in mind that we do not expect a production-ready platform or a fully complete implementation. There is also no need to implement any business logic for the application itself. Instead, we aim to gain insight into your working style, decision-making process, and how you approach infrastructure design, automation, and operational challenges.
If there are aspects you would normally include in a real-world setup but that fall outside the scope or time constraints of this exercise, please document them or provide partial examples.
Please include the following:
A README or similar document outlining:
your assumptions
your architecture and design decisions
trade-offs you made and why
any limitations of your solution
what you would improve or extend with more time
A link to a Git repository or a zip file containing your Infrastructure as Code and any supporting implementation (e.g., configuration, pipeline definitions, scripts).
Clear instructions on how to navigate and review your repository structure. If parts of your solution contain executable code (like a module or script), explain how they would be applied in a real environment.
