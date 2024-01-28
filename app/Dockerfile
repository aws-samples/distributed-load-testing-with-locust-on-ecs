FROM locustio/locust:2.21.0
COPY . ./

# for standalone
ENTRYPOINT ["locust", "-f", "./locustfile.py", "--modern-ui"]
# for worker
# CMD [ "--worker", "--master-host", "MASTER_HOST_NAME"]
# for master
# CMD ["--master"]
