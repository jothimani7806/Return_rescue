from django.apps import AppConfig
import sys

class CoreConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'core'

    def ready(self):
        # Avoid early DB access during migrations or build steps
        if any(cmd in sys.argv for cmd in ['makemigrations', 'migrate', 'collectstatic', 'dumpdata', 'loaddata']):
            return
        
        # Connect to post_migrate signal or run safely
        from django.db.models.signals import post_migrate
        def on_post_migrate(sender, **kwargs):
            try:
                from core.mongodb import restore_records_from_mongodb_if_needed
                restore_records_from_mongodb_if_needed()
            except Exception:
                pass
        post_migrate.connect(on_post_migrate, sender=self)
