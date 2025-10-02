import CustomerAdapter from "../../adapters/CustomerAdapter.ts";
import CustomerEntity from "../../core/entities/customerEntity.ts";

describe("CustomerAdapter", () => {
  it("deve converter entidade para DTO corretamente", async () => {
    const customer = new CustomerEntity({
      // id: "test-id-123",
      name: "Maria",
      email: "maria@teste.com",
      phone: "88888-8888",
    });

    const dto = await CustomerAdapter.Dto(customer);

    expect(dto).toEqual({
      // id: "test-id-123",
      name: "Maria",
      email: "maria@teste.com",
      phone: "88888-8888",
    });
  });
});
