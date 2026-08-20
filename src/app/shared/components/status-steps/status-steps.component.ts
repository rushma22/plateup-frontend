import { Component, input } from '@angular/core';
import { OrderStatus } from '../../../core/models/order.models';

interface Step {
  id: 'received' | 'preparing' | 'ready';
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
    { id: 'preparing', label: 'Cooking' },
    { id: 'ready', label: 'Ready' },
  ];

  /**
   * Map guest status onto the 3 kitchen steps.
   * Completed = all steps done. Cancelled is handled outside this component.
   */
  stepState(stepId: Step['id']): 'done' | 'active' | 'todo' {
    const order = ['received', 'preparing', 'ready'] as const;
    const raw = this.status();
    if (raw === 'cancelled') {
      return 'todo';
    }
    const currentIndex =
      raw === 'completed' ? order.length : order.indexOf(raw as Step['id']);
    const index = order.indexOf(stepId);
    if (currentIndex < 0) {
      return 'todo';
    }
    if (index < currentIndex) {
      return 'done';
    }
    if (index === currentIndex && raw !== 'completed') {
      return 'active';
    }
    if (raw === 'completed') {
      return 'done';
    }
    return 'todo';
  }
}
