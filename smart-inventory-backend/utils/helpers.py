from typing import Any, Dict


def dump_model(model: Any, **kwargs) -> Dict[str, Any]:
    """Universal Pydantic v1 & v2 model dump helper."""
    if hasattr(model, "model_dump"):
        return model.model_dump(**kwargs)
    return model.dict(**kwargs)
