export interface AccountingAccount {
  id: string;
  code: string;
  createdAt: Date;
  updatedAt: Date;
}

export type AccountingAccountInput = Pick<AccountingAccount, 'code'>;
