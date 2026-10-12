import uuid
from typing import List, Optional
from sqlalchemy.orm import Session
from app.models.brand import Brand
from app.schemas.brand import BrandCreate, BrandUpdate


class BrandService:
    @staticmethod
    def get_by_id(db: Session, brand_id: uuid.UUID) -> Optional[Brand]:
        return db.query(Brand).filter(Brand.id == brand_id).first()

    @staticmethod
    def list_brands(db: Session, skip: int = 0, limit: int = 100) -> List[Brand]:
        return db.query(Brand).order_by(Brand.created_at.desc()).offset(skip).limit(limit).all()

    @staticmethod
    def create_brand(db: Session, brand_in: BrandCreate) -> Brand:
        db_brand = Brand(
            name=brand_in.name,
            website=brand_in.website,
            logo_url=brand_in.logo_url,
            official_social_urls=brand_in.official_social_urls or [],
            official_apps=brand_in.official_apps or [],
            official_developers=brand_in.official_developers or [],
            aliases=brand_in.aliases or [],
        )
        db.add(db_brand)
        db.commit()
        db.refresh(db_brand)
        return db_brand

    @staticmethod
    def update_brand(db: Session, brand_id: uuid.UUID, brand_in: BrandUpdate) -> Optional[Brand]:
        brand = db.query(Brand).filter(Brand.id == brand_id).first()
        if not brand:
            return None

        update_data = brand_in.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(brand, key, value)

        db.commit()
        db.refresh(brand)
        return brand

    @staticmethod
    def delete_brand(db: Session, brand_id: uuid.UUID) -> bool:
        brand = db.query(Brand).filter(Brand.id == brand_id).first()
        if not brand:
            return False

        db.delete(brand)
        db.commit()
        return True
