import time
from typing import Callable, Any

class CircuitBreakerOpenException(Exception):
    pass

class LLMCircuitBreaker:
    """
    Enterprise Circuit Breaker for LLM calls.
    If the LLM fails repeatedly or times out, the circuit opens.
    When open, the system falls back to strict deterministic policies
    and completely blocks autonomous AI financial actions until manually reset.
    """
    def __init__(self, max_failures: int = 3, reset_timeout_seconds: int = 60):
        self.max_failures = max_failures
        self.reset_timeout_seconds = reset_timeout_seconds
        
        self.failure_count = 0
        self.last_failure_time = 0
        self.state = "CLOSED"  # CLOSED (normal), OPEN (failing), HALF_OPEN (testing recovery)
        
    def execute(self, func: Callable, *args, fallback_action: Callable = None, **kwargs) -> Any:
        self._check_state()
        
        if self.state == "OPEN":
            if fallback_action:
                return fallback_action()
            raise CircuitBreakerOpenException("Circuit is OPEN. LLM integration is currently suspended for safety.")
            
        try:
            result = func(*args, **kwargs)
            self._record_success()
            return result
        except Exception as e:
            self._record_failure()
            if self.state == "OPEN" and fallback_action:
                return fallback_action()
            raise e
            
    def _check_state(self):
        if self.state == "OPEN":
            if time.time() - self.last_failure_time > self.reset_timeout_seconds:
                self.state = "HALF_OPEN"
                
    def _record_failure(self):
        self.failure_count += 1
        self.last_failure_time = time.time()
        if self.failure_count >= self.max_failures:
            self.state = "OPEN"
            
    def _record_success(self):
        self.failure_count = 0
        self.state = "CLOSED"

# Global circuit breaker instance
llm_circuit_breaker = LLMCircuitBreaker()
