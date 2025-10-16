"""
Locust load testing file for Synapse backend API

Usage:
    locust -f locustfile.py --host=http://localhost:8000

    # Run with specific users and spawn rate
    locust -f locustfile.py --host=http://localhost:8000 --users 100 --spawn-rate 10

    # Run headless mode
    locust -f locustfile.py --host=http://localhost:8000 --users 100 --spawn-rate 10 --run-time 5m --headless

Performance targets:
    - Sync endpoints: < 1s P95
    - Recommendation endpoints: < 500ms P95
    - Report generation: < 3s P95
    - Concurrent users: 100
"""

from locust import HttpUser, task, between
import random
import string
from datetime import datetime, timedelta


def random_string(length=10):
    """Generate random string"""
    return ''.join(random.choices(string.ascii_letters + string.digits, k=length))


def random_email():
    """Generate random email"""
    return f"test_{random_string(8)}@example.com"


class SynapseUser(HttpUser):
    """Simulates a Synapse app user"""

    # Wait time between tasks (1-3 seconds)
    wait_time = between(1, 3)

    def on_start(self):
        """
        Called when a simulated user starts.
        Register and login to get access token.
        """
        # Register a new user
        email = random_email()
        password = "TestPassword123!"

        register_response = self.client.post(
            "/auth/register",
            json={
                "email": email,
                "password": password,
            },
            name="/auth/register",
        )

        if register_response.status_code != 201:
            print(f"Registration failed: {register_response.text}")
            return

        # Login
        login_response = self.client.post(
            "/auth/login",
            json={
                "email": email,
                "password": password,
            },
            name="/auth/login",
        )

        if login_response.status_code == 200:
            data = login_response.json()
            self.access_token = data["access_token"]
            self.user_id = data["user"]["id"]
            self.headers = {"Authorization": f"Bearer {self.access_token}"}

            # Create some initial test notes
            self.note_ids = []
            for i in range(5):
                note_id = self._create_test_note(f"Initial note {i + 1}")
                if note_id:
                    self.note_ids.append(note_id)
        else:
            print(f"Login failed: {login_response.text}")

    def _create_test_note(self, title: str) -> str | None:
        """Helper to create a test note"""
        import uuid

        note_id = str(uuid.uuid4())
        body = f"{title}\nThis is a test note for load testing. " + random_string(100)

        note_data = {
            "id": note_id,
            "body": body,
            "importance": random.randint(1, 3),
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat(),
        }

        return note_id

    @task(10)
    def push_sync(self):
        """
        Push sync: Simulate uploading local changes
        Weight: 10 (high frequency)
        """
        if not hasattr(self, "access_token"):
            return

        # Create batch of changes
        changes = []
        for i in range(random.randint(1, 5)):
            import uuid

            note_id = str(uuid.uuid4())
            changes.append({
                "entity_type": "note",
                "entity_id": note_id,
                "operation": "upsert",
                "data": {
                    "id": note_id,
                    "body": f"Load test note {random_string(20)}\n{random_string(200)}",
                    "importance": random.randint(1, 3),
                    "created_at": datetime.utcnow().isoformat(),
                    "updated_at": datetime.utcnow().isoformat(),
                },
                "client_timestamp": datetime.utcnow().isoformat(),
            })

        # Add some note_ids for future recommendations
        if changes:
            self.note_ids.extend([c["entity_id"] for c in changes])

        with self.client.post(
            "/sync/push",
            json={
                "changes": changes,
                "device_id": f"device_{random_string(10)}",
                "last_checkpoint": None,
            },
            headers=self.headers,
            catch_response=True,
            name="/sync/push",
        ) as response:
            if response.status_code == 200:
                response.success()
            else:
                response.failure(f"Push sync failed: {response.text}")

    @task(8)
    def pull_sync(self):
        """
        Pull sync: Simulate downloading server changes
        Weight: 8
        """
        if not hasattr(self, "access_token"):
            return

        with self.client.post(
            "/sync/pull",
            json={
                "device_id": f"device_{random_string(10)}",
                "last_checkpoint": None,
            },
            headers=self.headers,
            catch_response=True,
            name="/sync/pull",
        ) as response:
            if response.status_code == 200:
                response.success()
            else:
                response.failure(f"Pull sync failed: {response.text}")

    @task(5)
    def get_recommendations(self):
        """
        Get recommendations for a note
        Weight: 5
        Target: < 500ms P95
        """
        if not hasattr(self, "access_token") or not self.note_ids:
            return

        note_id = random.choice(self.note_ids)

        with self.client.get(
            f"/recommend/{note_id}",
            params={"k": 5},
            headers=self.headers,
            catch_response=True,
            name="/recommend/:note_id",
        ) as response:
            if response.status_code == 200:
                # Check if response time meets target
                if response.elapsed.total_seconds() * 1000 < 500:
                    response.success()
                else:
                    response.failure(
                        f"Recommendation took {response.elapsed.total_seconds() * 1000:.0f}ms (target: 500ms)"
                    )
            elif response.status_code == 404:
                # Not found is acceptable (note might not have embeddings yet)
                response.success()
            else:
                response.failure(f"Recommendation failed: {response.text}")

    @task(2)
    def generate_weekly_report(self):
        """
        Generate weekly report
        Weight: 2 (less frequent)
        Target: < 3s P95
        """
        if not hasattr(self, "access_token"):
            return

        # Generate report for last week
        today = datetime.utcnow()
        week_start = today - timedelta(days=7)

        with self.client.get(
            "/reports/weekly",
            params={
                "start_date": week_start.strftime("%Y-%m-%d"),
                "end_date": today.strftime("%Y-%m-%d"),
            },
            headers=self.headers,
            catch_response=True,
            name="/reports/weekly",
        ) as response:
            if response.status_code == 200:
                # Check if response time meets target
                if response.elapsed.total_seconds() < 3:
                    response.success()
                else:
                    response.failure(
                        f"Report generation took {response.elapsed.total_seconds():.1f}s (target: 3s)"
                    )
            elif response.status_code == 400:
                # No notes found is acceptable
                response.success()
            else:
                response.failure(f"Report generation failed: {response.text}")

    @task(1)
    def refresh_token(self):
        """
        Refresh access token
        Weight: 1 (least frequent)
        """
        if not hasattr(self, "access_token"):
            return

        with self.client.post(
            "/auth/refresh",
            headers=self.headers,
            catch_response=True,
            name="/auth/refresh",
        ) as response:
            if response.status_code == 200:
                data = response.json()
                self.access_token = data["access_token"]
                self.headers = {"Authorization": f"Bearer {self.access_token}"}
                response.success()
            else:
                response.failure(f"Token refresh failed: {response.text}")


class AdminUser(HttpUser):
    """Simulates an admin or monitoring user checking health"""

    wait_time = between(5, 10)

    @task
    def health_check(self):
        """Check API health endpoint"""
        self.client.get("/health", name="/health")

    @task
    def root_check(self):
        """Check API root endpoint"""
        self.client.get("/", name="/")
