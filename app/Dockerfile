FROM --platform=linux/amd64 locustio/locust:2.8.3
COPY . ./

# for standalone
ENTRYPOINT ["locust", "-f", "./locustfile.py"]
# for worker
# CMD [ "--worker", "--master-host", "MASTER_HOST_NAME"]
# for master
# CMD ["--master"]
