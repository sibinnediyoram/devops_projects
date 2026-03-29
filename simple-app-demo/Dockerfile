FROM nginx:alpine

# Remove default page
RUN rm -rf /usr/share/nginx/html/*

# Copy our custom page
COPY index.html /usr/share/nginx/html/index.html

EXPOSE 80