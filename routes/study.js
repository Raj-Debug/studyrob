const express = require('express');
const StudySession = require('../models/StudySession');
const User = require('../models/User');
const requireAuth = require('../middleware/auth');
const { sendSessionCompleteEmail } = require('../utils/email');

const router = express.Router();

const ROBUX_PER_HOUR = 5;

router.post('/start', requireAuth, async (req, res) => {
  try {
    const hours = Number(req.body.hours);
    if (!Number.isInteger(hours) || hours < 1 || hours > 6) {
      return res.status(400).json({ error: 'Choose a whole number of hours between 1 and 6.' });
    }

    const session = await StudySession.create({
      user: req.userId,
      hoursPlanned: hours,
      status: 'in-progress',
    });

    res.status(201).json({ session });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not start your session.' });
  }
});

router.post('/complete/:sessionId', requireAuth, async (req, res) => {
  try {
    const session = await StudySession.findOne({
      _id: req.params.sessionId,
      user: req.userId,
    });

    if (!session) return res.status(404).json({ error: 'Session not found.' });
    if (session.status === 'completed') {
      return res.status(409).json({ error: 'This session was already completed.' });
    }

    const hoursCompleted = session.hoursPlanned;
    const robuxEarned = hoursCompleted * ROBUX_PER_HOUR;

    session.status = 'completed';
    session.robuxEarned = robuxEarned;
    session.completedAt = new Date();
    await session.save();

    const user = await User.findByIdAndUpdate(
      req.userId,
      {
        $inc: {
          totalHoursStudied: hoursCompleted,
          totalRobuxEarned: robuxEarned,
        },
      },
      { new: true }
    );

    // Fire off the admin notification email — failures here shouldn't block the response
    sendSessionCompleteEmail({
      username: user.username,
      hoursCompleted,
      robuxEarned,
      totalRobuxEarned: user.totalRobuxEarned,
    }).catch((err) => console.error('Email send failed:', err));

    res.json({
      session,
      robuxEarned,
      totalRobuxEarned: user.totalRobuxEarned,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not complete your session.' });
  }
});

router.post('/abandon/:sessionId', requireAuth, async (req, res) => {
  const session = await StudySession.findOneAndUpdate(
    { _id: req.params.sessionId, user: req.userId, status: 'in-progress' },
    { status: 'abandoned' },
    { new: true }
  );
  res.json({ session });
});

router.get('/history', requireAuth, async (req, res) => {
  const sessions = await StudySession.find({ user: req.userId }).sort({ startedAt: -1 }).limit(50);
  res.json({ sessions });
});

module.exports = router;
