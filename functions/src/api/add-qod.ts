/* eslint-disable max-len */
import {getFirestore} from "firebase-admin/firestore";
import {logger} from "firebase-functions/v2";
import {HttpsError, onCall} from "firebase-functions/v2/https";

const QUESTIONS = [
  "Do you think you've changed over the last two years?",
  "If you change one thing about yourself, what would that be?",
  "What is your dearest memory from the last twelve months?",
  "What is your favourite memory from childhood?",
  "Who is your closest family member and why?",
  "Explain the reason why you fell in love with your last relevant partner",
  "What is your greatest fear?",
  "What should I be wary of regarding your \"conflict style\"? (e.g. shutdown and get dismissive)",
  "What do you regret about your past relationship?",
  "What is your biggest regret in the past twelve months?",
  "How do you like to relax? (e.g. Poker nights, Netflix binge, like to drink etc.)",
  "How do you usually measure whether someone is the well suited to you? (e.g. you don't mind spending time with them on Sunday arvos)",
  "How do you deal with jealousy?",
  "When was the last time you cried in front of someone?",
  "Describe the last time you lost control of your emotions",
  "What is your greatest accomplishment in the last twelve months?",
  "When was the last time you hurt another person?",
  "What is the best compliment you have received?",
  "How would you like to be remembered by your ex-partners?",
  "What is the most controversial thing on your bucket list?  (e.g. rob a bank, dine and dash etc.)",
  "What was the greatest insecurity in your past relationship?",
  "What did your ex-partners most adore about you?",
  "What is your greatest fantasy?",
  "What is the riskiest thing you've done in the past twelve months?",
  "Are you an overthinker or carefree person?",
  "Questions design to draw out difficult things but actually important ^^",
  "Do you believe in marriage?",
  "Do you like to plan events or do you like surprises?",
  "If there were money but limited choice, would you rather possessions (nice car and house) or travel (nice experiences)?",
  "What is something you could not stand about an ex?",
  "When was the last time you were furious?",
  "What is something that others find odd about you?",
  "Imagining the extremities, would you rather white lies or inappropriately being told the bitter truth all the time?",
  "Questions like \"would you rather + why\" to show where people actually stand on a spectrum",
  "What are your candid thoughts on cheating?",
  "What would be the number one baggage you would bring into a new relationship?",
  "Tell me about a past mistake you made in a prior relationship?",
  "During conflict, do you rever to becoming avoidant or anxious?",
  "What scares you most about relationships?",
  "Can you share a role model couple ... and explain why?",
  "Have you ever been \"in love in love\" - what does that feel like for you?",
  "When was the last time you felt happy?",
  "When was the last time you felt sad?",
  "What is your biggest fear in life right now?",
  "How would you ex warn me about you?",
  "What would your ex celebrate about you to me?",
  "Can you describe the last time you did wrong to someone?",
  "What is your biggest takeaway from your last relationship?",
  "In what ways have you been \"toxic\" in past relationships?",
  "What is the thing you want to actively improve upon in your next relationship?",
  "What are the key things you want in a partner?",
  "What are the key things you wish to avoid in a partner?",
  "What do you bring to the table in a relationship?",
  "What is your love language? Can you share an applied example?",
  "Have you ever been cheated on?  How has that affected your thinking / perspective?",
  "Do you think cheating can ever be justified?",
  "If your friend were cheating on their partner, how would you deal with this situation?",
  "Are you able to recognise and identify abusive relationships?  If so, how?",
  "What is your most controversial opinion?",
  "In what ways are you most \"misunderstood\"?",
  "What is your biggest dream or aspiration?",
  "What motivates you to pursue your goals?",
  "How you practice self-care?",
  "What is something you've always wanted to try or learn?",
  "What do you admire or respect most about yourself?",
  "What is your biggest weakness that you are trying to address?",
  "What is a quote that holds weight to you? Please no \"Live, Laugh, Love\"",
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
  "If you had to pick a \"spirit animal\", what would it be and why?",
  "If you had to pick a super power, what would it be?",
  "If you were a flavour of ice cream, what would you be and why?",
  "Have you found a sense of purpose or calling in life?  Discuss",
  "What is a milestone event in your life that redirected the path of your life?",
  "Describe your most cherished relationship at the moment?",
  "What is the number one advice you'd share with your 18yo self, knowing what you know now?",
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
  "What is the \"geekiest\" / strangest quirk about you that you not normally share upfront?",
  "What made you particularly different at school?",
  "Out of the 5 senses, what is most sensual to you and why?",
  "What makes you feel loved and appreciated?",
  "What is your love language - how you like to receive and how you like to show?",
  "If you could relive one year of your life, which year would that be and why?",
  "Share your biggest turn off in the opposite sex",
  "Share something pivotal in your childhood",
  "What is a topic you'd like to avoid discussing on your first date and why?",
  "If you had to cook for your partner, what would be your go to?",
  "What is your favourite book and why?",
  "Would you consider yourself more of an entrovert or an introvert?  Why?",
  "What is your movie genre of choice and why?",
  "What is one habit you are actively trying to break?",
  "What are your thoughts on exclusivity when dating?  How would you go about wanting exclusivity?",
  "What is your view on physical intimacy during the early stages of dating?",
  "How do you like to show kindness to others?",
  "What is your favourite way to give back to the community?",
  "Elaborate the thing that you value most in a connected relationship (e.g. trust, transparency, respect, intimacy)",
  "How do you define loyalty in a relationship?",
  "What is your spirit animal and why?",
  "What is your unique skill / attribute that most people do not have?",
  "Would you rather material items or experiences?",
  "In what scenario, if any, is it okay to lie?",
  "When, if ever, is it okay to break the law?",
  "What do you see as your best character trait?",
  "What is one character trait that you would love to improve / develop?",
  "What is your longest lasting friendship and how / why does it last for so long?",
  "Do you think it is possible for opposite genders to maintain a friendship without developing a love interest?",
  "Do you think couples should split costs?",
  "How should household chores be divided?",
  "What do you look for in a significant other?",
  "Describe your ideal vacation / holiday",
  "Share at least 3 bucket list items",
  "Share any phobias or your most irrational fear",
  "What is the superpower that you would pick and why?",
  "If you could have one human talent that you do not currently have, what would it be?",
  "If you could correct one world issue, what would that be?",
];

/**
 * Randomly return a QoD for a connection.
 * TODO: Implementation or AI integration
 * @param {Array<string>} excludedQod
 * @return {string}
 */
function _getQod(excludedQod?: Array<string>): string | undefined {
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
  const payload = {createdAt: current, question: ""};

  try {
    await getFirestore().runTransaction(async (transaction) => {
      const docRef = getFirestore().collection("connection").doc(connectionId);
      const connectionData = (await transaction.get(docRef)).data();
      const excludedQod: Array<string> = connectionData?.["_excludedQod"] ? connectionData["_excludedQod"] : [];
      const newQod = _getQod(excludedQod);

      if (!newQod) {
        throw Error(`No more QoD for the connection (${connectionId})`);
      }

      payload.question = newQod;

      // Add new question to excluded list
      excludedQod.push(payload.question);

      logger.debug(`Get a new QoD for connection "${connectionId}"`);

      // Update fields "_syncedAt" and "_excludedQod" of connection doc
      transaction.update(
        docRef,
        {
          _syncedAt: current,
          _excludedQod: excludedQod,
        }
      );

      await docRef.collection("qod").add(payload);

      logger.debug(`New QoD has been added to connection "${connectionId}"`);
    });

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

