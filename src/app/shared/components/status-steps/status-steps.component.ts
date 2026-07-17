import { Component, input } from '@angular/core';
import { OrderStatus } from '../../../core/models/order.models';

interface Step {
  id: OrderStatus;
  label: string;
}

@Component({
  selector: 'app-status-steps',
  standalone: true,
  templateUrl: './status-steps.component.html',
  styleUrls: ['./status-steps.component.scss'],
})
export class StatusStepsComponent {
  readonly status = input.required<OrderStatus>();

  readonly steps: Step[] = [
    { id: 'received', label: 'Received' },
    { id: 'preparing', label: 'Preparing' },
    { id: 'ready', label: 'Ready' },
  ];

  stepState(stepId: OrderStatus): 'done' | 'active' | 'todo' {
    const order = ['received', 'preparing', 'ready'] as OrderStatus[];
    const current = order.indexOf(this.status());
    const index = order.indexOf(stepId);
    if (index < current) {
      return 'done';
    }
    if (index === current) {
      return 'active';
    }
    return 'todo';
  }
}
