import { Component, inject } from '@angular/core';
import { IonButton } from '@ionic/angular/standalone';
import { TableSessionService } from '../../../core/services/table-session.service';

/**
 * Shown while the table session is CLOSING.
 * Countdown comes from backend autoCloseAt (survives refresh).
 */
@Component({
  selector: 'app-session-closing-banner',
  standalone: true,
  templateUrl: './session-closing-banner.component.html',
  styleUrls: ['./session-closing-banner.component.scss'],
  imports: [IonButton],
})
export class SessionClosingBannerComponent {
  readonly tableSession = inject(TableSessionService);

  openReview(): void {
    const url = this.tableSession.reviewUrl();
    if (!url) {
      return;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}
