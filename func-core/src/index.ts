import {logger} from "firebase-functions/v2";
import {onRequest} from "firebase-functions/v2/https";

/**
 * Function to calculate two numbers
 * @param {number} param1
 * @param {number} param2
 * @return {number}
 */
function calculate(param1: number, param2: number): number {
  return param1 + param2;
}

export const onCalculate = onRequest((request, response) => {
  const param1 = request.body.param1;
  const param2 = request.body.param2;

  logger.info(`param1: ${param1}`, {structuredData: true});
  response.status(200).send(calculate(param1 as number, param2 as number));
});
