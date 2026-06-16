import { Pipe, PipeTransform, inject } from '@angular/core';
import { LanguageService, TranslationKey } from '../services/language.service';

@Pipe({ name: 't', standalone: true, pure: false })
export class TranslatePipe implements PipeTransform {
  private readonly lang = inject(LanguageService);

  transform(key: TranslationKey, params?: Record<string, string | number>): string {
    return this.lang.t(key, params);
  }
}
