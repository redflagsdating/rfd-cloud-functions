/* eslint-disable max-len */
import {getFirestore} from "firebase-admin/firestore";
import {logger} from "firebase-functions/v2";
import {HttpsError, onCall} from "firebase-functions/v2/https";

const QUESTIONS = [
  "Do you think you've changed over the last two years?",
  "\"If you change one thing about yourself",
  "What is your dearest memory from the last twelve months?",
  "What is your favourite memory from childhood?",
  "Who is your closest family member and why?",
  "Explain the reason why you fell in love with your last relevant partner",
  "What is your greatest fear?",
  "\"What should I be wary of regarding your \"\"conflict style\"\"? (e.g. shutdown and get dismissive)\"",
  "What do you regret about your past relationship?",
  "What is your biggest regret in the past twelve months?",
  "\"How do you like to relax? (e.g. Poker nights)",
  "How do you usually measure whether someone is the well suited to you? (e.g. you don't mind spending time with them on Sunday arvos)",
  "How do you deal with jealousy?",
  "When was the last time you cried in front of someone?",
  "Describe the last time you lost control of your emotions",
  "What is your greatest accomplishment in the last twelve months?",
  "When was the last time you hurt another person?",
  "What is the best compliment you have received? ",
  "How would you like to be remembered by your ex-partners?",
  "\"What is the most controversial thing on your bucket list?  (e.g. rob a bank)",
  "What was the greatest insecurity in your past relationship?",
  "What did your ex-partners most adore about you?",
  "What is your greatest fantasy?",
  "What is the riskiest thing you've done in the past twelve months?",
  "Are you an overthinker or carefree person?",
  "Questions design to draw out difficult things but actually important ^^",
  "Do you believe in marriage?",
  "Do you like to plan events or do you like surprises?",
  "\"If there were money but limited choice",
  "What is something you could not stand about an ex?",
  "When was the last time you were furious?",
  "What is something that others find odd about you?",
  "\"Imagining the extremities",
  "\"Questions like \"\"would you rather + why\"\" to show where people actually stand on a spectrum\"",
  "What are your candid thoughts on cheating?",
  "What would be the number one baggage you would bring into a new relationship?",
  "Tell me about a past mistake you made in a prior relationship?",
  "\"During conflict",
  "What scares you most about relationships?",
  "Can you share a role model couple ... and explain why?",
  "\"Have you ever been \"\"in love in love\"\" - what does that feel like for you?\"",
  "When was the last time you felt happy?",
  "When was the last time you felt sad?",
  "What is your biggest fear in life right now?",
  "How would you ex warn me about you?",
  "What would your ex celebrate about you to me?",
  "Can you describe the last time you did wrong to someone?",
  "What is your biggest takeaway from your last relationship?",
  "\"In what ways have you been \"\"toxic\"\" in past relationships?\"",
  "What is the thing you want to actively improve upon in your next relationship?",
  "What are the key things you want in a partner?",
  "What are the key things you wish to avoid in a partner?",
  "What do you bring to the table in a relationship?",
  "What is your love language? Can you share an applied example?",
  "Have you ever been cheated on?  How has that affected your thinking / perspective?",
  "Do you think cheating can ever be justified?  ",
  "\"If your friend were cheating on their partner",
  "\"Are you able to recognise and identify abusive relationships?  If so",
  "What is your most controversial opinion?",
  "\"In what ways are you most \"\"misunderstood\"\"?\"",
  "What is your biggest dream or aspiration?",
  "What motivates you to pursue your goals?",
  "How you practice self-care?",
  "What is something you've always wanted to try or learn?",
  "What do you admire or respect most about yourself?",
  "What is your biggest weakness that you are trying to address?",
  "\"What is a quote that holds weight to you? Please no \"\"Live",
  "Can you tell me about your best mentor in life? Past or present",
  "What is your greatest achievement to date in life?",
  "What is your greatest achievement this year?",
  "How do you handle stress or difficult situations?",
  "In what ways have you grown this year?",
  "What have your learned about yourself from this year upon reflection?",
  "How do you like to resolve conflict? (e.g. space and time)",
  "What is the key to a happy and healthy relationship?",
  "How do you like to communicate and be communicated with?",
  "How would you define trust (in practical terms) in a relationship?",
  "What has your own family taught you about love?",
  "Do you have anything that you do religiously every [day / week]?",
  "What is your biggest career ambition and how do you plan to get there?",
  "What is something you wish to accomplish in the next twelve months?",
  "Can you elaborate on one of your green flags?",
  "Can you elaborate on one of your red flags?",
  "\"If you had to pick a \"\"spirit animal\"\"",
  "\"If you had to pick a super power",
  "\"If you were a flavour of ice cream",
  "Have you found a sense of purpose or calling in life?  Discuss",
  "What is a milestone event in your life that redirected the path of your life?",
  "Describe your most cherished relationship at the moment?",
  "What is the number one advice you'd share with your 18yo self",
  "Share a mistake you've made and what you learned thereafter?",
  "Share a relationship that you should consider cutting?",
  "Share a \"failure\" you've experienced in the past 5 years?",
  "What would you never want to change about yourself?",
  "What would you change about your childhood?",
  "How would you have done the last 10 years differently?",
  "For what are you most grateful for in your life at the moment?",
  "Share your most unhealthy habit",
  "What is your most healthy habit",
  "What is the one thing you fear your potential partner might misjudge or misintepret about you during the initial phases of dating?",
  "What do you most dislike about the way you approach disagreements or conflict?",
];

/**
 * Randomly return a QoD for a connection.
 * TODO: Implementation or AI integration
 * @param {Array<string>} excludedQod
 * @return {string}
 */
function _getQod(excludedQod?: Array<string>): string {
  const questions = QUESTIONS.filter((value) => {
    return !(excludedQod ?? []).includes(value);
  });

  return questions[Math.floor(Math.random() * questions.length)];
}

/**
 * Add a new **QoD** to the given connection's `Document`.
 * @param {string} connectionId
 * @return {Promise<FirebaseFirestore.DocumentData | undefined>}
 * @throws Error If the provided input is not valid Firestore data.
 */
async function addQodFunc(connectionId: string): Promise<FirebaseFirestore.DocumentData | undefined> {
  const current = new Date();
  const connectionDocRef = getFirestore().collection("connection").doc(connectionId);
  const connectionData = (await connectionDocRef.get()).data();
  const payload = {createdAt: current, question: ""};
  const excludedQod: Array<string> = connectionData?.["_excludedQod"] ? connectionData["_excludedQod"] : [];

  payload.question = _getQod(excludedQod);

  // Add new question to excluded list
  excludedQod.push(payload.question);

  logger.debug(`Get a new QoD for connection "${connectionId}"`);

  try {
    // Update fields "_syncedAt" and "_excludedQod" of connection doc
    await connectionDocRef.update({
      _syncedAt: current,
      _excludedQod: excludedQod,
    });
    await connectionDocRef.collection("qod").add(payload);

    logger.debug(`New QoD has been added to connection "${connectionId}"`);

    return payload;
  } catch (error) {
    logger.error(error);
    throw error;
  }
}


/**
 * addQod HTTP Callable function.
 * (Call from Firebase Function client SDK)
 */
const addQod = onCall<{connectionId?: string}>(
  async (request) => {
  // Bad request error message. Follow Google JSON data schema.
  // https://google.github.io/styleguide/jsoncstyleguide.xml#JSON_Structure_&_Reserved_Property_Names
    let message;

    // Checking that the user is authenticated.
    if (!request.auth || !request.auth?.uid) {
      message = "The function must be called while authenticated.";

      logger.debug(message);
      throw new HttpsError("unauthenticated", message, {status: 401});
    }

    const connectionId = request.data.connectionId;

    if (!connectionId) {
      message = `Query param "connectionId" is (${typeof connectionId})`;
      logger.debug(message);
      throw new HttpsError("invalid-argument", message, {status: 400});
    }

    try {
      logger.debug(`New QoD has been added for connection "${connectionId}"`);
      return await addQodFunc(connectionId as string);
    } catch (error) {
      logger.error(error);
      throw new HttpsError(
        "internal",
        (error as Error)?.message,
        {status: 500}
      );
    }
  });

export {QUESTIONS, addQod, addQodFunc};

