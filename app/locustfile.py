from locust import HttpUser, task

# Defining a sample task. You can write your own locust script here.
class SampleUser(HttpUser):
    @task
    def get_index(self):
        self.client.get("/")
