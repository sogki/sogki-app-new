import logging
import sys


def configure_logging() -> None:
    root = logging.getLogger("sentinel")
    if root.handlers:
        return
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(
        logging.Formatter(
            fmt='{"level":"%(levelname)s","logger":"%(name)s","message":"%(message)s"}'
        )
    )
    root.addHandler(handler)
    root.setLevel(logging.INFO)


def get_logger(name: str) -> logging.Logger:
    return logging.getLogger(f"sentinel.{name}")
