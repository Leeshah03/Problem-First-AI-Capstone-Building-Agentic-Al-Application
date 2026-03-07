import crypto from 'crypto';
import { db } from '../db/index.js';
import { reviewQueue, signals, themeSignals, themes } from '../db/schema.js';
import { eq, and, desc, asc, count } from 'drizzle-orm';

export async function getReviewQueue(req, res) {
  try {
    const {
      status = 'pending',
      type = '',
      page = '1',
      limit = '50',
      sort = 'created_at_desc',
    } = req.query;

    const pageNum = parseInt(page);
    const limitNum = Math.min(parseInt(limit), 100);
    const offset = (pageNum - 1) * limitNum;

    const conditions = [eq(reviewQueue.orgId, req.orgId)];
    if (status) conditions.push(eq(reviewQueue.status, status));
    if (type) conditions.push(eq(reviewQueue.reviewType, type));

    const whereClause = and(...conditions);

    const orderMap = {
      'created_at_desc': desc(reviewQueue.createdAt),
      'created_at_asc': asc(reviewQueue.createdAt),
      'confidence_asc': asc(reviewQueue.aiConfidence),
      'confidence_desc': desc(reviewQueue.aiConfidence),
    };
    const orderBy = orderMap[sort] || desc(reviewQueue.createdAt);

    const [totalResult] = await db.select({ value: count() }).from(reviewQueue).where(whereClause);

    const items = await db.select({
      rq: reviewQueue,
      source: signals.source,
      signalTitle: signals.title,
      signalContent: signals.content,
      signalAccount: signals.account,
      signalSpeaker: signals.speaker,
      signalArr: signals.arr,
      signalVotes: signals.votes,
      signalBiasTag: signals.biasTag,
      signalAiSummary: signals.aiSummary,
      signalExternalId: signals.externalId,
    }).from(reviewQueue)
      .innerJoin(signals, eq(signals.id, reviewQueue.signalId))
      .where(whereClause)
      .orderBy(orderBy)
      .limit(limitNum)
      .offset(offset);

    const result = [];
    for (const item of items) {
      const rq = item.rq;

      const themeRows = await db.select({
        themeId: themeSignals.themeId,
        themeName: themes.name,
        relevance: themeSignals.relevance,
        assignedBy: themeSignals.assignedBy,
      }).from(themeSignals)
        .innerJoin(themes, eq(themes.id, themeSignals.themeId))
        .where(eq(themeSignals.signalId, rq.signalId));

      result.push({
        id: rq.id,
        signalId: rq.signalId,
        pipelineRunId: rq.pipelineRunId,
        reviewType: rq.reviewType,
        status: rq.status,
        aiSuggestedThemes: rq.aiSuggestedThemes,
        aiSuggestedBias: rq.aiSuggestedBias,
        aiConfidence: rq.aiConfidence,
        currentThemeId: rq.currentThemeId,
        reviewerNotes: rq.reviewerNotes,
        reviewedAt: rq.reviewedAt,
        createdAt: rq.createdAt,
        signal: {
          id: rq.signalId,
          source: item.source,
          title: item.signalTitle,
          content: item.signalContent,
          account: item.signalAccount,
          speaker: item.signalSpeaker,
          arr: item.signalArr,
          votes: item.signalVotes,
          biasTag: item.signalBiasTag,
          aiSummary: item.signalAiSummary,
          externalId: item.signalExternalId,
        },
        themes: themeRows.map(t => ({
          themeId: t.themeId,
          themeName: t.themeName,
          relevance: t.relevance,
          assignedBy: t.assignedBy,
        })),
      });
    }

    res.json({ items: result, total: totalResult.value, page: pageNum, limit: limitNum });
  } catch (err) {
    console.error('Error fetching review queue:', err);
    res.status(500).json({ error: 'Failed to fetch review queue' });
  }
}

export async function reviewItem(req, res) {
  try {
    const { id } = req.params;
    const { action, newThemeId, notes } = req.body;
    const now = new Date();

    const [item] = await db.select().from(reviewQueue)
      .where(and(eq(reviewQueue.id, id), eq(reviewQueue.orgId, req.orgId)));
    if (!item) return res.status(404).json({ error: 'Review item not found' });

    if (action === 'accept') {
      if (item.reviewType === 'bias_conflict' && item.aiSuggestedBias) {
        await db.update(signals).set({ biasTag: item.aiSuggestedBias })
          .where(eq(signals.id, item.signalId));
      }
      if (item.reviewType === 'low_confidence') {
        await db.update(signals).set({ needsReview: false })
          .where(eq(signals.id, item.signalId));
      }
    } else if (action === 'reject') {
      if (item.reviewType === 'low_confidence') {
        await db.update(signals).set({ needsReview: false })
          .where(eq(signals.id, item.signalId));
      }
    } else if (action === 'reclassify' && newThemeId) {
      await db.delete(themeSignals)
        .where(and(eq(themeSignals.signalId, item.signalId), eq(themeSignals.assignedBy, 'ai-classify')));
      await db.insert(themeSignals).values({
        id: crypto.randomUUID(),
        themeId: newThemeId,
        signalId: item.signalId,
        relevance: 1.0,
        assignedBy: 'manual-reclassify',
        orgId: req.orgId,
        createdAt: now,
      });
      await db.update(signals).set({ needsReview: false })
        .where(eq(signals.id, item.signalId));
    }

    const newStatus = action === 'reclassify' ? 'reclassified' : action === 'accept' ? 'accepted' : 'rejected';
    await db.update(reviewQueue).set({
      status: newStatus,
      reviewerNotes: notes || null,
      reviewedBy: req.userId,
      reviewedAt: now,
    }).where(eq(reviewQueue.id, id));

    res.json({ success: true });
  } catch (err) {
    console.error('Error reviewing item:', err);
    res.status(500).json({ error: 'Failed to review item' });
  }
}

export async function batchReview(req, res) {
  try {
    const { ids, action } = req.body;
    if (!ids || !Array.isArray(ids) || !action) {
      return res.status(400).json({ error: 'ids (array) and action required' });
    }

    const now = new Date();
    const status = action === 'accept' ? 'accepted' : 'rejected';

    await db.transaction(async (tx) => {
      for (const id of ids) {
        // Get review item
        const [item] = await tx.select().from(reviewQueue)
          .where(and(eq(reviewQueue.id, id), eq(reviewQueue.orgId, req.orgId)));
        if (!item) continue;

        await tx.update(reviewQueue).set({
          status,
          reviewedBy: req.userId,
          reviewedAt: now,
        }).where(eq(reviewQueue.id, id));

        // Clear review flag on the signal
        await tx.update(signals).set({ needsReview: false })
          .where(eq(signals.id, item.signalId));

        if (action === 'accept' && item.reviewType === 'bias_conflict' && item.aiSuggestedBias) {
          await tx.update(signals).set({ biasTag: item.aiSuggestedBias })
            .where(eq(signals.id, item.signalId));
        }
      }
    });

    res.json({ success: true, updated: ids.length });
  } catch (err) {
    console.error('Error batch reviewing:', err);
    res.status(500).json({ error: 'Failed to batch review' });
  }
}
