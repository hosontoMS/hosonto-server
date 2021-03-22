const data = {
  test_table: [
    { id: 2, val: "abc", val2: "def", val3: "efg" },
    { id: 3, val: "hij", val2: "klm", val3: "nop" },
  ],
  users_table: [
    {
      id: 1,
      username: "test1",
      firstname: "abc",
      password: "passtest1",
      about: "Protected about text from 1",
      _shared_ids: [],
      _owner_id: 1,
    },
    {
      id: 2,
      username: "test2",
      firstname: "def",
      password: "passtest2",
      about: "Protected about text from 2",
      _shared_ids: [1],
      _owner_id: 2,
    },
    {
      id: 3,
      username: "test3",
      firstname: "ghi",
      password: "passtest3",
      about: "Protected about text from 3",
      _shared_ids: [],
      _owner_id: 3,
    },
  ],
  users: [
    {
      _id: "56d9bf92f9be48771d6fe5b1",
      name: "test",
    },
    {
      _id: "56d9bf92f9be48771d6fe5b2",
      name: "John",
    },
  ],
  tasks: [
    {
      userId: "56d9bf92f9be48771d6fe5b1",
      task: "do stuff",
    },
    {
      userId: "56d9bf92f9be48771d6fe5b2",
      task: "fix stuff",
    },
  ],
};
module.exports = data;
