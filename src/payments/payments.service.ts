import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
// import { envs } from 'src/config';
import Stripe from 'stripe';
import { PaymentSessionDto } from './dto/payment-session.dto';
import { Request, Response } from 'express';
import { NATS_SERVICE } from 'src/config';
import { ClientProxy } from '@nestjs/microservices';

@Injectable()
export class PaymentsService {

  private readonly stripe = new Stripe(this.configService.get<string>('STRIPE_SECRET'));
  private readonly logger = new Logger('PaymentsService');

  constructor(
    private configService: ConfigService,
    @Inject(NATS_SERVICE) private readonly client: ClientProxy
  ) { }

  async createPaymentSession(paymentSessionDto: PaymentSessionDto) {
    const { currency, items, orderId } = paymentSessionDto;

    const lineItems = items.map(item => {
      return {
        price_data: {
          currency: currency,
          product_data: {
            name: item.name
          },
          unit_amount: Math.round(item.price * 100)
        },
        quantity: item.quantity
      }
    });

    const session = await this.stripe.checkout.sessions.create({

      payment_intent_data: {
        metadata: {
          orderId: orderId   // Colocar aqui el ID de mi orden
        }
      },

      line_items: lineItems,
      mode: 'payment',
      success_url: this.configService.get<string>('STRIPE_SUCCESS_URL'),
      cancel_url: this.configService.get<string>('STRIPE_CANCEL_URL')
    });

    return {
      cancelUrl: session.cancel_url,
      successUrl: session.success_url,
      url: session.url
    }
  }

  async stripeWebhook(req: Request, res: Response) {

    const sig = req.headers['stripe-signature'];
    let event: Stripe.Event;
    const endpointSecret = this.configService.get<string>('STRIPE_ENDPOINT_SECRET');

    try {
      event = this.stripe.webhooks.constructEvent(
        req['rawBody'],
        sig,
        endpointSecret
      );
    } catch (err) {
      res.status(400).send(`Webhook error: ${err.message}`);
      return;
    }

    switch (event.type) {

      case 'charge.succeeded':
        const chargeSuceeded = event.data.object;
        const payload = {
          stripePaymentId: chargeSuceeded.id,
          orderId: chargeSuceeded.metadata.orderId,
          receiptUrl: chargeSuceeded.receipt_url,
        }
        this.client.emit('payment.succeeded', payload); // Evento para emitir pago exitoso al ordersMS
        break;

      default:
        console.log(`Event ${event.type} not handled`)
    }

    return res.status(200).json({ sig });
  }

}
