import { db } from '../utils/database';

export class AddressRepository {
  async create(addressData: {
    street: string;
    city: string;
    country: string;
    userId: string;
  }) {
    const address = await db
      .insertInto('addresses')
      .values({
        street: addressData.street,
        city: addressData.city,
        country: addressData.country,
        userId: addressData.userId,
      })
      .returningAll()
      .executeTakeFirst();

    return address;
  }

  async findByUserId(userId: string) {
    const address = await db
      .selectFrom('addresses')
      .where('userId', '=', userId)
      .selectAll()
      .executeTakeFirst();

    return address;
  }
}
