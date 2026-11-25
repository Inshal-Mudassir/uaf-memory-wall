from fastapi import APIRouter, Depends, HTTPException, Request

from ..db import get_db
from ..schemas import ReportIn
from ..security import limit_report, voter_id
from .common import parse_oid
from .memories import _record_report

router = APIRouter(prefix="/comments", tags=["Comments"])


@router.post("/{comment_id}/report", dependencies=[Depends(limit_report)], summary="Report a comment to moderators")
async def report_comment(comment_id: str, body: ReportIn, request: Request):
    db = get_db()
    oid = parse_oid(comment_id)
    if not await db.comments.find_one({"_id": oid}, {"_id": 1}):
        raise HTTPException(404, "We couldn't find that comment.")
    return await _record_report(db, db.comments, "comment", oid, body.reason, voter_id(request))
