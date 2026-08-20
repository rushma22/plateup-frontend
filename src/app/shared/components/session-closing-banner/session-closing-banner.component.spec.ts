import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TableSessionService } from '../../../core/services/table-session.service';
import { SessionClosingBannerComponent } from './session-closing-banner.component';

describe('SessionClosingBannerComponent', () => {
  let fixture: ComponentFixture<SessionClosingBannerComponent>;
  let isClosing: ReturnType<typeof signal<boolean>>;
  let isClosed: ReturnType<typeof signal<boolean>>;
  let reviewUrl: ReturnType<typeof signal<string | null>>;
  let countdownLabel: ReturnType<typeof signal<string>>;

  beforeEach(async () => {
    isClosing = signal(true);
    isClosed = signal(false);
    reviewUrl = signal<string | null>(null);
    countdownLabel = signal('14:59');

    await TestBed.configureTestingModule({
      imports: [SessionClosingBannerComponent],
      providers: [
        {
          provide: TableSessionService,
          useValue: {
            isClosing: () => isClosing(),
            isClosed: () => isClosed(),
            reviewUrl: () => reviewUrl(),
            countdownLabel: () => countdownLabel(),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SessionClosingBannerComponent);
  });

  it('shows the closing message and countdown', () => {
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain(
      'Your orders are complete. This table will be cleared in 15 minutes.'
    );
    expect(text).toContain('14:59');
  });

  it('hides the review button when reviewUrl is missing', () => {
    reviewUrl.set(null);
    fixture.detectChanges();
    const button = fixture.nativeElement.querySelector('ion-button');
    expect(button).toBeNull();
  });

  it('shows the review button when reviewUrl is configured', () => {
    reviewUrl.set('https://reviews.example/place');
    fixture.detectChanges();
    const button = fixture.nativeElement.querySelector('ion-button');
    expect(button).not.toBeNull();
    expect(button.textContent).toContain('Review this restaurant');
  });

  it('shows the cleared message when the session is closed', () => {
    isClosing.set(false);
    isClosed.set(true);
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('This table has been cleared.');
  });
});
