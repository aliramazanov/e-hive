FROM nginx:latest

# Install required dependencies
RUN apt-get update && apt-get install -y \
  luarocks \
  && rm -rf /var/lib/apt/lists/*

# Install lua-resty-jwt using luarocks
RUN luarocks install lua-resty-jwt

# Copy the nginx configuration file
COPY k8s/nginx/nginx.conf /etc/nginx/nginx.conf

# Expose the port
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
