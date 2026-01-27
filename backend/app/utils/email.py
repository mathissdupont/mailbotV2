import re

def is_valid_email(email: str) -> bool:
    """
    Basic email validation using regex.
    Returns True if the email is valid, False otherwise.
    """
    pattern = r"^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$"
    return re.match(pattern, email) is not None
