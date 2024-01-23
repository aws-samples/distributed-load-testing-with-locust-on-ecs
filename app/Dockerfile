FROM --platform=linux/amd64 locustio/locust:2.20.1
COPY . ./

# for standalone
ENTRYPOINT ["locust", "-f", "./locustfile.py", "--modern-ui"]
# for worker
# CMD [ "--worker", "--master-host", "MASTER_HOST_NAME"]
# for master
# CMD ["--master"]
