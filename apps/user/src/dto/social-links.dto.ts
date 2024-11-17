import { IsOptional, IsUrl, Matches } from 'class-validator';

export class SocialLinksDto {
  @IsOptional()
  @IsUrl({ protocols: ['https'], require_protocol: true })
  @Matches(/^https:\/\/(www\.)?x\.com\/[A-Za-z0-9_]{1,15}$/)
  x?: string;

  @IsOptional()
  @IsUrl({ protocols: ['https'], require_protocol: true })
  @Matches(/^https:\/\/(www\.)?linkedin\.com\/in\/[\w\-]{3,100}\/?$/)
  linkedin?: string;

  @IsOptional()
  @IsUrl({ protocols: ['https'], require_protocol: true })
  @Matches(/^https:\/\/(www\.)?github\.com\/[A-Za-z0-9_-]+\/?$/)
  github?: string;

  @IsOptional()
  @IsUrl({ protocols: ['https'], require_protocol: true })
  website?: string;

  @IsOptional()
  @IsUrl({ protocols: ['https'], require_protocol: true })
  @Matches(
    /^https:\/\/(www\.)?instagram\.com\/[A-Za-z0-9_](?:[A-Za-z0-9_]|\.(?!\.)){0,28}[A-Za-z0-9_]\/?$/,
  )
  instagram?: string;

  static cleanUrl(url: string): string {
    if (!url) return url;
    return new URL(url).toString().replace(/\/$/, '');
  }
}
