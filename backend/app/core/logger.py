import logging
import json
import sys
from datetime import datetime, timezone
import contextvars

request_id_var = contextvars.ContextVar("request_id", default=None)

class JSONFormatter(logging.Formatter):
    """
    Format standard python logs as JSON string for structured observability.
    """
    def format(self, record):
        log_record = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }
        
        req_id = request_id_var.get()
        if req_id:
            log_record["request_id"] = req_id
            
        # Include any extra kwargs pass to logger (e.g. logger.info("msg", extra={"user_id": 123}))
        for key, value in record.__dict__.items():
            if key not in ["args", "asctime", "created", "exc_info", "exc_text", "filename", "funcName", "id", "levelname", "levelno", "lineno", "module", "msecs", "message", "msg", "name", "pathname", "process", "processName", "relativeCreated", "stack_info", "thread", "threadName", "taskName"]:
                log_record[key] = value

        if record.exc_info:
            log_record["exception"] = self.formatException(record.exc_info)
            
        return json.dumps(log_record)

def setup_logger(name="goauct_api"):
    logger = logging.getLogger(name)
    
    # Prevent duplicate handlers
    if not logger.handlers:
        logger.setLevel(logging.INFO)
        handler = logging.StreamHandler(sys.stdout)
        handler.setFormatter(JSONFormatter())
        logger.addHandler(handler)
        # Disable propagation so we don't double log with root logger
        logger.propagate = False
        
    return logger

logger = setup_logger()
