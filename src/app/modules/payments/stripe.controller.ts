// Use 'stripe-event-types' for better type discrimination.
/// <reference types="stripe-event-types" />
import axios from 'axios'
import { celebrate, Joi, Segments } from 'celebrate'
import { StatusCodes } from 'http-status-codes'
import get from 'lodash/get'
import { errAsync, okAsync, ResultAsync } from 'neverthrow'
import Stripe from 'stripe'

import {
  ErrorDto,
  GetPaymentInfoDto,
  IncompletePaymentsDto,
  ReconciliationEventsReportLine,
  ReconciliationReport,
} from '../../../../shared/types'
import config from '../../config/config'
import { paymentConfig } from '../../config/features/payment.config'
import { createLoggerWithLabel } from '../../config/logger'
import { stripe } from '../../loaders/stripe'
import { generatePdfFromHtml } from '../../utils/convert-html-to-pdf'
import { createReqMeta } from '../../utils/request'
import { ControllerHandler } from '../core/core.types'
import * as FormService from '../form/form.service'
import * as PendingSubmissionModel from '../pending-submission/pending-submission.service'
import { checkFormIsEncryptMode } from '../submission/encrypt-submission/encrypt-submission.service'

import { PaymentAccountInformationError } from './payments.errors'
import * as PaymentService from './payments.service'
import {
  StripeFetchError,
  StripeMetadataIncorrectEnvError,
} from './stripe.errors'
import * as StripeService from './stripe.service'
import { mapRouteError } from './stripe.utils'

const logger = createLoggerWithLabel(module)

/**
 * Middleware which validates that a request came from Stripe webhook by
 * checking the presence of Stripe-Signature in request header
 */
const validateStripeWebhook = celebrate({
  [Segments.HEADERS]: Joi.object({
    'stripe-signature': Joi.string().required(),
  }).unknown(),
})

/**
 * Handler for GET /api/v3/notifications/stripe
 * Receives Stripe webhooks and updates the database with transaction details.
 *
 * @returns 200 if webhook is successfully processed
 * @returns 202 if webhooks is not meant for this environment and will be processed by another environment
 * @returns 400 if the Stripe-Signature header is missing or invalid, or the event is malformed
 * @returns 404 if the payment or submission linked to the event cannot be found
 * @returns 422 if any errors occurs in processing the webhook or saving payment to DB
 * @returns 500 if any unexpected errors occur
 */
const _handleStripeEventFromWebhook: ControllerHandler<
  never,
  void | ErrorDto,
  string
> = async (req, res) => {
  // Step 1: Verify the payload and ensure that it is indeed sent from Stripe.
  // See https://stripe.com/docs/webhooks/signatures
  const sig = req.headers['stripe-signature']
  if (!sig) return res.sendStatus(StatusCodes.BAD_REQUEST)

  // Needed to obtain the raw body from the request. Set in the parser middlewares
  const rawBody = get(req, 'rawBody') as unknown as string

  let event: Stripe.DiscriminatedEvent
  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      sig,
      paymentConfig.stripeWebhookSecret,
    ) as Stripe.DiscriminatedEvent
  } catch (error) {
    // Throws Stripe.errors.StripeSignatureVerificationError
    logger.error({
      message: 'Received invalid request from Stripe webhook endpoint',
      meta: {
        action: 'handleStripeEventFromWebhook',
        req: req.body,
        error,
      },
    })
    return res.sendStatus(StatusCodes.BAD_REQUEST)
  }

  // Step 2: Received event, proceed to process it.
  const logMeta = {
    action: 'handleStripeEventFromWebhook',
    event,
  }

  logger.info({
    message: 'Received Stripe event from webhook',
    meta: logMeta,
  })

  // Step 3: Process the event
  await StripeService.handleStripeEvent(event)
    // Step 4: Return response to Stripe based on result
    .match(
      () => res.sendStatus(StatusCodes.OK),
      (error) => {
        if (error instanceof StripeMetadataIncorrectEnvError) {
          // Intercept this error and return 202 Accepted instead, indicating
          // the request will be processed by another environment server.
          return res.sendStatus(StatusCodes.ACCEPTED)
        }
        // Additional logging with error details
        logger.error({
          message: 'Error thrown in Stripe webhook event handler',
          meta: logMeta,
          error,
        })
        const { errorMessage, statusCode } = mapRouteError(error)
        return res.status(statusCode).json({ message: errorMessage })
      },
    )
}

export const handleStripeEventFromWebhook = [
  validateStripeWebhook,
  _handleStripeEventFromWebhook,
]

export const checkPaymentReceiptStatus: ControllerHandler<{
  formId: string
  paymentId: string
}> = async (req, res) => {
  const { formId, paymentId } = req.params
  logger.info({
    message: 'getPaymentStatus endpoint called',
    meta: {
      action: 'getPaymentStatus',
      formId,
      paymentId,
    },
  })

  return PaymentService.findPaymentById(paymentId)
    .map((payment) => {
      logger.info({
        message: 'Found paymentId in payment document',
        meta: {
          action: 'checkPaymentReceiptStatus',
          payment,
        },
      })

      if (!payment.completedPayment?.receiptUrl) {
        return res.status(StatusCodes.NOT_FOUND).json({ isReady: false })
      }
      return res.status(StatusCodes.OK).json({ isReady: true })
    })
    .mapErr((error) => {
      return res.status(StatusCodes.NOT_FOUND).json({ message: error })
    })
}

/**
 * Handler for GET /api/v3/payments/:formId/:paymentId/invoice/download
 * Receives Stripe webhooks and updates the database with transaction details.
 *
 * @returns 200 if webhook is successfully processed
 * @returns 404 if the PaymentId is not found
 * @returns 404 if the FormId is not found
 * @returns 404 if payment.completedPayment?.receiptUrl is not found
 */
export const downloadPaymentInvoice: ControllerHandler<{
  formId: string
  paymentId: string
}> = (req, res) => {
  const { formId, paymentId } = req.params
  logger.info({
    message: 'downloadPaymentInvoice endpoint called',
    meta: {
      action: 'downloadPaymentInvoice',
      formId,
      paymentId,
    },
  })

  return ResultAsync.combine([
    PaymentService.findPaymentById(paymentId),
    FormService.retrieveFullFormById(formId).andThen(checkFormIsEncryptMode),
  ])
    .andThen(([payment, populatedForm]) => {
      logger.info({
        message: 'Found paymentId in payment document',
        meta: {
          action: 'downloadPaymentInvoice',
          payment,
        },
      })
      return StripeService.generatePaymentInvoice(payment, populatedForm)
    })
    .map((pdfBuffer) => {
      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename=${paymentId}-proofofpayment.pdf`,
      })
      return res.status(StatusCodes.OK).send(pdfBuffer)
    })
    .mapErr((error) => {
      logger.error({
        message: 'Error retrieving invoice',
        meta: {
          action: 'downloadPaymentInvoice',
          formId,
          paymentId,
        },
        error,
      })
      return res.status(StatusCodes.NOT_FOUND).json({ message: error })
    })
}

/**
 * Handler for GET /api/v3/payments/:formId/:paymentId/invoice/download
 * Receives Stripe webhooks and updates the database with transaction details.
 *
 * @returns 200 if webhook is successfully processed
 * @returns 404 if the PaymentId is not found
 * @returns 404 if the FormId is not found
 * @returns 404 if payment.completedPayment?.receiptUrl is not found
 */
export const downloadPaymentReceipt: ControllerHandler<{
  formId: string
  paymentId: string
}> = (req, res) => {
  const { formId, paymentId } = req.params
  logger.info({
    message: 'downloadPaymentReceipt endpoint called',
    meta: {
      action: 'downloadPaymentReceipt',
      formId,
      paymentId,
    },
  })

  return PaymentService.findPaymentById(paymentId)
    .map((payment) => {
      logger.info({
        message: 'Found paymentId in payment document',
        meta: {
          action: 'downloadPaymentReceipt',
          payment,
        },
      })
      if (!payment.completedPayment?.receiptUrl) {
        return res
          .status(StatusCodes.NOT_FOUND)
          .send({ message: 'Receipt url not ready' })
      }
      // retrieve receiptURL as html
      return (
        axios
          .get<string>(payment.completedPayment.receiptUrl)
          // convert to pdf and return
          .then((receiptUrlResponse) => {
            const html = receiptUrlResponse.data
            const pdfBufferPromise = generatePdfFromHtml(html)
            return pdfBufferPromise
          })
          .then((pdfBuffer) => {
            res.set({
              'Content-Type': 'application/pdf',
              'Content-Disposition': `attachment; filename=${paymentId}-receipt.pdf`,
            })
            return res.status(StatusCodes.OK).send(pdfBuffer)
          })
      )
    })
    .mapErr((error) => {
      logger.error({
        message: 'Error retrieving receipt',
        meta: {
          action: 'downloadPaymentReceipt',
          formId,
          paymentId,
        },
        error,
      })
      return res.status(StatusCodes.NOT_FOUND).json({ message: error })
    })
}

const _handleConnectOauthCallback: ControllerHandler<
  unknown,
  unknown,
  unknown,
  { code?: string; state: string }
> = async (req, res) => {
  const { code, state } = req.query
  // Step 0: Extract state parameter previously signed and stored in cookies.
  // Compare state values to ensure that no tampering has occurred.
  const { stripeState } = req.signedCookies
  if (state !== stripeState) {
    return res.status(StatusCodes.UNPROCESSABLE_ENTITY).json({
      message: 'Invalid state parameter',
    })
  }

  // Step 1: Retrieve formId from state.
  // Redirect user back to payments page if code is undefined
  const formId = state.split('.')[0]
  const redirectUrl = `${config.app.appUrl}/admin/form/${formId}/settings/payments`
  if (!code) {
    return res.redirect(redirectUrl)
  }

  // Step 2: Retrieve currently logged-in user.
  return (
    FormService.retrieveFullFormById(formId)
      .andThen(checkFormIsEncryptMode)
      .andThen((form) =>
        StripeService.exchangeCodeForAccessToken(code).andThen((token) => {
          // Step 4: Store access token in form.
          return StripeService.linkStripeAccountToForm(form, {
            accountId: token.stripe_user_id,
            publishableKey: token.stripe_publishable_key,
          })
        }),
      )
      .map(() => {
        // Step 5: Redirect back to settings page.
        return res.redirect(redirectUrl)
      })
      // Also redirect back to settings page if there is an error.
      .mapErr((error) => {
        logger.error({
          message: 'Error handling stripe oauth callback',
          meta: {
            action: 'handleConnectOauthCallback',
            ...createReqMeta(req),
          },
          error,
        })
        return res.redirect(redirectUrl)
      })
  )
}

export const _handleConnectOauthCallbackForTest = _handleConnectOauthCallback

export const handleConnectOauthCallback = [
  celebrate({
    [Segments.QUERY]: Joi.object({
      code: Joi.string(),
      state: Joi.string().required(),
    }).unknown(true),
  }),
  _handleConnectOauthCallback,
] as ControllerHandler[]

export const getPaymentInfo: ControllerHandler<
  { paymentId: string },
  GetPaymentInfoDto | ErrorDto
> = async (req, res) => {
  const { paymentId } = req.params

  const logMeta = {
    action: 'getPaymentInfo',
    paymentId,
  }

  logger.info({
    message: 'getPaymentInfo endpoint called',
    meta: logMeta,
  })

  return PaymentService.findPaymentById(paymentId)
    .andThen((payment) => {
      return PendingSubmissionModel.findPendingSubmissionById(
        payment.pendingSubmissionId,
      )
        .andThen((submission) =>
          FormService.retrieveFullFormById(submission.form),
        )
        .andThen(checkFormIsEncryptMode) // Payment forms are encrypted
        .andThen((form) => {
          const stripeAccount = payment.targetAccountId
          // Early termination to prevent consumption of QPS limit to stripe
          if (stripeAccount !== form.payments_channel.target_account_id) {
            logger.error({
              message:
                'Target stripe account for this form has changed, unable to get payment info',
              meta: logMeta,
            })
            return errAsync(new PaymentAccountInformationError())
          }

          const paymentIntentId = payment.paymentIntentId
          return ResultAsync.fromPromise(
            stripe.paymentIntents.retrieve(paymentIntentId, {
              stripeAccount,
            }),
            (error) => {
              logger.error({
                message: 'Calling stripe.paymentIntents.retrieve failed',
                meta: {
                  ...logMeta,
                  paymentIntentId,
                  error,
                },
              })
              return new StripeFetchError(String(error))
            },
          ).map((paymentIntent) => {
            return res.status(StatusCodes.OK).json({
              client_secret: paymentIntent.client_secret || '',
              publishableKey: form.payments_channel.publishable_key,
              payment_intent_id: payment.paymentIntentId,
              submissionId: payment.pendingSubmissionId,
            })
          })
        })
    })
    .mapErr((error) => {
      const { errorMessage, statusCode } = mapRouteError(error)
      return res.status(statusCode).json({ message: errorMessage })
    })
}

/**
 * Handler for GET /payments/reconcile/incompletePayments
 * Retrieves payments that are in Pending or Failed states
 *
 * @returns 200 with found payment records
 * @returns 500 if there were unexpected errors in retrieving payment data
 */
export const getIncompletePayments: ControllerHandler<
  never,
  IncompletePaymentsDto | ErrorDto
> = (_req, res) => {
  return PaymentService.getIncompletePayments()
    .andThen((payments) =>
      ResultAsync.combine(
        payments.map((payment) =>
          okAsync({
            stripeAccount: payment.targetAccountId,
            paymentId: payment._id,
          }),
        ),
      ),
    )
    .map((paymentMetas) => {
      return res.status(StatusCodes.OK).json(paymentMetas)
    })
    .mapErr((error) => {
      return res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json({ message: error.message })
    })
}

/**
 * Handler for POST /payments/reconcile/account/:stripeAccount?maxAgeHrs=<number>
 * Fetches undelivered stripe webhooks and replays event for the supplied account
 *
 * @param {string} stripeAccount the Stripe account id of the account to be reconciles
 * @body {string[]} paymentIds the list of payment ids to reconcile
 * @query {number} (optional) maxAgeHrs the max age of events to attempt reconciliation for, in hours before now; if omitted, it is treated as infinite
 *
 * @returns 200 with two report arrays, one for event processing and another for payment status verification
 * @returns 500 if there were unexpected errors in retrieving data from Stripe
 */
export const reconcileAccount: ControllerHandler<
  { stripeAccount: string },
  ReconciliationReport | ErrorDto,
  { paymentIds: string[] },
  { maxAgeHrs?: number }
> = (req, res) => {
  const { stripeAccount } = req.params
  const { paymentIds } = req.body
  const { maxAgeHrs } = req.query

  const logMeta = {
    action: 'reconcileAccount',
    stripeAccount,
    paymentIds,
    maxAgeHrs,
  }

  logger.info({
    message: 'Reconciling account started',
    meta: logMeta,
  })

  const eventsReport: ReconciliationEventsReportLine[] = []

  return StripeService.getUndeliveredStripeEventsForAccount(
    stripeAccount,
    maxAgeHrs,
  )
    .forEach(async (event) => {
      logger.info({
        message: 'Started processing Stripe event while reconciling account',
        meta: { ...logMeta, event },
      })

      await StripeService.handleStripeEvent(event as Stripe.DiscriminatedEvent)
        .andThen(() => {
          logger.warn({
            message:
              'Successfully processed Stripe event while reconciling account',
            meta: { ...logMeta, event },
          })
          eventsReport.push({ event })
          return okAsync(undefined)
        })
        .orElse((error) => {
          if (error instanceof StripeMetadataIncorrectEnvError) {
            // Intercept this as it is not really an error. Ignore it as it was
            // never meant for this environment anyway.
            return okAsync(undefined)
          }
          logger.error({
            message: 'Failed to process Stripe event while reconciling account',
            meta: { ...logMeta, event },
            error,
          })
          eventsReport.push({
            event,
            error: error.message,
          })
          return okAsync(undefined)
        })
    })
    .andThen(() =>
      // Validate all the associated payments with Stripe
      ResultAsync.combineWithAllErrors(
        paymentIds.map(StripeService.verifyPaymentStatusWithStripe),
      ),
    )
    .match(
      (reconciliationReport) =>
        res.status(StatusCodes.OK).json({ eventsReport, reconciliationReport }),
      (errors) => {
        const errorsAsArray = errors instanceof Array ? errors : [errors]
        const message = errorsAsArray.map((error) => error.message).join('; ')
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message })
      },
    )
}
