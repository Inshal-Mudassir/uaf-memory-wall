from typing import Literal

from pydantic import BaseModel, Field


class CommentIn(BaseModel):
    text: str = Field(min_length=1, max_length=800)
    authorName: str = Field(default="", max_length=60)
    isAnonymous: bool = False
    website: str = Field(default="", max_length=200)  # honeypot: real visitors never fill this in


class LikeIn(BaseModel):
    liked: bool


class ReportIn(BaseModel):
    reason: str = Field(default="", max_length=200)


class ModerationPatch(BaseModel):
    isHidden: bool | None = None
    dismissReports: bool | None = None


SortOption = Literal["newest", "oldest", "popular"]
