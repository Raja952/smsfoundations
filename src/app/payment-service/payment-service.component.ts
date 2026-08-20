// import { Component } from '@angular/core';

// @Component({
//   selector: 'app-payment-service',
//   templateUrl: './payment-service.component.html',
//   styleUrls: ['./payment-service.component.scss']
// })
// export class PaymentService {

// }

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface PaymentRequest {
  amount: number;
}

export interface CreateOrderResponse {
  orderId: string;
  amount: number;
  currency: string;
  keyId: string;
}

@Injectable({
  providedIn: 'root'
})
export class PaymentServiceComponent {

  private apiUrl = 'https://localhost:7200/api/Payment';

  constructor(private http: HttpClient) {}

  createOrder(amount: number): Observable<CreateOrderResponse> {

    const request: PaymentRequest = {
      amount: amount
    };

    return this.http.post<CreateOrderResponse>(
      `${this.apiUrl}/create-order`,
      request
    );
  }
}