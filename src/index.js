// @flow
import type { User } from '../types/PetStore';

function printUser(user: User): void {
  console.log("User:", user);
}

const newUser: User = {
  id: 1,
  username: 'johnDoe',
  firstName: 'John',
  lastName: 'Doe',
  email: 'johnDoe@example.com',
  phone: '+123456789'
}

printUser(newUser);
