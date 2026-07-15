import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import interviewRouter from "./interview";
import aptitudeRouter from "./aptitude";
import resumeRouter from "./resume";
import openaiConversationsRouter from "./openai_conversations";
import linkedinRouter from "./linkedin";
import coverLetterRouter from "./cover-letter";
import leetcodeRouter from "./leetcode";
import questionBankRouter from "./question-bank";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(interviewRouter);
router.use(aptitudeRouter);
router.use(resumeRouter);
router.use(openaiConversationsRouter);
router.use(linkedinRouter);
router.use(coverLetterRouter);
router.use(leetcodeRouter);
router.use(questionBankRouter);

export default router;
