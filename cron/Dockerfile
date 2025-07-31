FROM cronicle/edge:latest

# Create necessary directories
RUN mkdir -p /opt/cronicle/logs/hms 
RUN mkdir -p /opt/cronicle/jobs
# RUN mkdir -p /opt/cronicle/scripts

# Copy job scripts to the container
COPY jobs/ /opt/cronicle/jobs/
# COPY scripts/ /opt/cronicle/scripts/

# Make scripts executable
RUN chmod +x /opt/cronicle/jobs/*.sh
# RUN chmod +x /opt/cronicle/scripts/*.sh