from typing import Optional

CANONICAL_TAX_STATUSES = ("Foreclosure", "Deed", "Lien")

FORECLOSURE_TERMS = [
    "foreclosure", "mortgage", "sheriff"
]

DEED_TERMS = [
    "tax deed", "deed", "quit claim", "resale", "struck-off", "upset",
    "repository", "commissioner", "mayors sale", "mayor sale",
    "land bank", "building detroit", "sealed bid"
]

LIEN_TERMS = [
    "lien", "tax sale", "cert", "tax defaulted", "tax auction", "treasurer"
]


def infer_canonical_tax_status(
    tax_status: Optional[str] = None,
    name: Optional[str] = None,
    short_name: Optional[str] = None,
    notes: Optional[str] = None,
) -> str:
    """
    Standardizes auction tax_status strictly to one of:
    - 'Foreclosure'
    - 'Deed'
    - 'Lien'

    Inference priority:
    1. Foreclosure: contains 'foreclosure', 'mortgage', 'sheriff'
    2. Deed: contains 'tax deed', 'deed', 'quit claim', 'resale', 'struck-off', 'upset',
             'repository', 'commissioner', 'mayors sale', 'mayor sale', 'land bank',
             'building detroit', 'sealed bid'
    3. Lien: contains 'lien', 'tax sale', 'cert', 'tax defaulted', 'tax auction', 'treasurer'
    4. Controlled Fallback: 'Deed'
    """
    # Build text to inspect
    parts = [str(p).strip() for p in [tax_status, name, short_name, notes] if p and str(p).strip()]
    combined = " ".join(parts).lower()

    if not combined:
        return "Deed"

    # 1. Foreclosure
    for term in FORECLOSURE_TERMS:
        if term in combined:
            return "Foreclosure"

    # 2. Deed
    for term in DEED_TERMS:
        if term in combined:
            return "Deed"

    # 3. Lien
    for term in LIEN_TERMS:
        if term in combined:
            return "Lien"

    # 4. Fallback
    return "Deed"
