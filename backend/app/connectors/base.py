from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional
from dataclasses import dataclass, field


class ConnectorStatus:
    ACTIVE = "active"
    UNCONFIGURED = "unconfigured"
    RATE_LIMITED = "rate_limited"
    ERROR = "error"


@dataclass
class ConnectorResult:
    connector_name: str
    source_type: str  # "social" or "app"
    status: str  # "active", "unconfigured", "rate_limited", "error"
    message: str
    candidates: List[Any] = field(default_factory=list)
    total_found: int = 0
    is_live: bool = True

    def to_dict(self) -> Dict[str, Any]:
        return {
            "connector_name": self.connector_name,
            "source_type": self.source_type,
            "status": self.status,
            "message": self.message,
            "total_found": self.total_found,
            "is_live": self.is_live,
        }


class BaseConnector(ABC):
    name: str = "base_connector"
    source_type: str = "social"  # "social" or "app"

    @abstractmethod
    def is_configured(self) -> bool:
        """Return True if connector credentials and prerequisites are satisfied."""
        pass

    @abstractmethod
    def get_status(self) -> Dict[str, Any]:
        """Return human-readable connector status and requirements."""
        pass

    @abstractmethod
    def search(
        self,
        query: str,
        brand_info: Optional[Dict[str, Any]] = None,
        limit: int = 10,
    ) -> ConnectorResult:
        """Execute real search query against the data source."""
        pass
