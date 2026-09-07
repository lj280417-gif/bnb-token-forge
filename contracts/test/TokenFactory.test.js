const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("TokenFactory Contract - Fase 2 Suite", function () {
  let TokenFactory;
  let factory;
  let admin;
  let treasury;
  let newTreasury;
  let user1;
  let user2;

  const INITIAL_FEE = ethers.parseEther("0.02"); // 0.02 tBNB / BNB

  beforeEach(async function () {
    [admin, treasury, newTreasury, user1, user2] = await ethers.getSigners();

    TokenFactory = await ethers.getContractFactory("TokenFactory");
    factory = await TokenFactory.deploy(
      admin.address,
      treasury.address,
      INITIAL_FEE
    );
    await factory.waitForDeployment();
  });

  describe("Inicialización del Factory", function () {
    it("Debe configurar correctamente al admin, treasury y serviceFee", async function () {
      expect(await factory.owner()).to.equal(admin.address);
      expect(await factory.treasuryWallet()).to.equal(treasury.address);
      expect(await factory.serviceFee()).to.equal(INITIAL_FEE);
      expect(await factory.getTokensCount()).to.equal(0);
    });

    it("Debe rechazar treasury en la dirección cero durante el despliegue", async function () {
      await expect(
        TokenFactory.deploy(admin.address, ethers.ZeroAddress, INITIAL_FEE)
      ).to.be.revertedWith("TokenFactory: Direccion de tesoreria invalida");
    });
  });

  describe("Creación de Tokens y Asignación de Propiedad", function () {
    it("1. Creación exitosa con pago exacto y emisión de evento", async function () {
      const tx = await factory.connect(user1).createToken(
        "Alpha Coin",
        "ALPHA",
        18,
        1000000,
        true,
        false,
        { value: INITIAL_FEE }
      );

      const receipt = await tx.wait();
      expect(await factory.getTokensCount()).to.equal(1);

      const userTokens = await factory.getUserTokens(user1.address);
      expect(userTokens.length).to.equal(1);

      const tokenAddress = userTokens[0];
      await expect(tx)
        .to.emit(factory, "TokenCreated")
        .withArgs(
          tokenAddress,
          user1.address,
          "Alpha Coin",
          "ALPHA",
          18,
          1000000,
          true,
          false,
          INITIAL_FEE,
          await ethers.provider.getBlock(receipt.blockNumber).then(b => b.timestamp)
        );
    });

    it("2. El usuario debe ser el OWNER exclusivo del nuevo token, no el Factory", async function () {
      await factory.connect(user1).createToken(
        "Beta Coin",
        "BETA",
        18,
        500000,
        false,
        false,
        { value: INITIAL_FEE }
      );

      const userTokens = await factory.getUserTokens(user1.address);
      const TokenContract = await ethers.getContractAt("StandardBEP20", userTokens[0]);

      expect(await TokenContract.owner()).to.equal(user1.address);
      expect(await TokenContract.owner()).to.not.equal(factory.target);
      expect(await TokenContract.owner()).to.not.equal(admin.address);
    });

    it("3. El usuario debe recibir el 100% del suministro inicial", async function () {
      const supply = 1000000;
      await factory.connect(user1).createToken(
        "Supply Coin",
        "SUP",
        18,
        supply,
        true,
        true,
        { value: INITIAL_FEE }
      );

      const userTokens = await factory.getUserTokens(user1.address);
      const TokenContract = await ethers.getContractAt("StandardBEP20", userTokens[0]);

      const expectedSupply = ethers.parseUnits(supply.toString(), 18);
      expect(await TokenContract.totalSupply()).to.equal(expectedSupply);
      expect(await TokenContract.balanceOf(user1.address)).to.equal(expectedSupply);
      expect(await TokenContract.balanceOf(factory.target)).to.equal(0n);
    });
  });

  describe("Manejo de Tarifas y Fondos", function () {
    it("4. Pago exacto: La tesorería debe recibir exactamente el serviceFee", async function () {
      const treasuryBefore = await ethers.provider.getBalance(treasury.address);

      await factory.connect(user1).createToken(
        "Exact Token",
        "EXT",
        18,
        1000,
        false,
        false,
        { value: INITIAL_FEE }
      );

      const treasuryAfter = await ethers.provider.getBalance(treasury.address);
      expect(treasuryAfter - treasuryBefore).to.equal(INITIAL_FEE);
    });

    it("5. Rechazo de comisión insuficiente", async function () {
      const insufficientFee = ethers.parseEther("0.01"); // Menos de 0.02
      await expect(
        factory.connect(user1).createToken(
          "Fail Token",
          "FAIL",
          18,
          1000,
          false,
          false,
          { value: insufficientFee }
        )
      ).to.be.revertedWith("TokenFactory: Tarifa de servicio insuficiente");
    });

    it("6. Reembolso correcto del excedente si el usuario envía de más", async function () {
      const sentAmount = ethers.parseEther("0.05"); // 0.03 de excedente sobre 0.02
      const treasuryBefore = await ethers.provider.getBalance(treasury.address);
      const userBefore = await ethers.provider.getBalance(user1.address);

      const tx = await factory.connect(user1).createToken(
        "Refund Token",
        "REF",
        18,
        1000,
        false,
        false,
        { value: sentAmount }
      );

      const receipt = await tx.wait();
      const gasSpent = receipt.gasUsed * receipt.gasPrice;

      const treasuryAfter = await ethers.provider.getBalance(treasury.address);
      const userAfter = await ethers.provider.getBalance(user1.address);

      // La tesorería solo recibe el fee exacto
      expect(treasuryAfter - treasuryBefore).to.equal(INITIAL_FEE);

      // El usuario solo gasta el fee + gas (el excedente de 0.03 fue devuelto)
      const expectedUserBalance = userBefore - INITIAL_FEE - gasSpent;
      expect(userAfter).to.equal(expectedUserBalance);
    });

    it("7. Permite crear tokens gratis si serviceFee es configurado en cero", async function () {
      await factory.connect(admin).setServiceFee(0n);
      expect(await factory.serviceFee()).to.equal(0n);

      await expect(
        factory.connect(user1).createToken(
          "Free Token",
          "FREE",
          18,
          1000,
          false,
          false,
          { value: 0n }
        )
      ).to.not.be.reverted;

      expect(await factory.getTokensCount()).to.equal(1);
    });

    it("15. El Factory NUNCA conserva saldo de BNB después de una creación exitosa", async function () {
      await factory.connect(user1).createToken(
        "Zero Balance Token",
        "ZBT",
        18,
        1000,
        false,
        false,
        { value: ethers.parseEther("0.05") } // con excedente
      );

      expect(await ethers.provider.getBalance(factory.target)).to.equal(0n);
    });
  });

  describe("Registros y Consultas", function () {
    it("8. Registro de tokens por usuario", async function () {
      await factory.connect(user1).createToken("Token 1", "TK1", 18, 100, false, false, { value: INITIAL_FEE });
      await factory.connect(user1).createToken("Token 2", "TK2", 18, 200, false, false, { value: INITIAL_FEE });
      await factory.connect(user2).createToken("Token 3", "TK3", 18, 300, false, false, { value: INITIAL_FEE });

      const user1Tokens = await factory.getUserTokens(user1.address);
      const user2Tokens = await factory.getUserTokens(user2.address);

      expect(user1Tokens.length).to.equal(2);
      expect(user2Tokens.length).to.equal(1);
      expect(await factory.getUserTokensCount(user1.address)).to.equal(2);
    });

    it("9. Registro global y contador total", async function () {
      await factory.connect(user1).createToken("Token A", "TKA", 18, 100, false, false, { value: INITIAL_FEE });
      await factory.connect(user2).createToken("Token B", "TKB", 18, 200, false, false, { value: INITIAL_FEE });

      const allTokens = await factory.getAllTokens();
      expect(allTokens.length).to.equal(2);
      expect(await factory.getTokensCount()).to.equal(2);
    });
  });

  describe("Control de Acceso y Parámetros del Administrador", function () {
    it("10. Cambio de tarifa de servicio solamente por admin", async function () {
      const newFee = ethers.parseEther("0.05");
      await expect(factory.connect(admin).setServiceFee(newFee))
        .to.emit(factory, "ServiceFeeUpdated")
        .withArgs(INITIAL_FEE, newFee);

      expect(await factory.serviceFee()).to.equal(newFee);

      await expect(
        factory.connect(user1).setServiceFee(newFee)
      ).to.be.revertedWithCustomError(factory, "OwnableUnauthorizedAccount");
    });

    it("11. Cambio de wallet de tesorería solamente por admin", async function () {
      await expect(factory.connect(admin).setTreasuryWallet(newTreasury.address))
        .to.emit(factory, "TreasuryWalletUpdated")
        .withArgs(treasury.address, newTreasury.address);

      expect(await factory.treasuryWallet()).to.equal(newTreasury.address);

      await expect(
        factory.connect(user1).setTreasuryWallet(newTreasury.address)
      ).to.be.revertedWithCustomError(factory, "OwnableUnauthorizedAccount");
    });

    it("12. Rechazo de treasury address(0) en setTreasuryWallet", async function () {
      await expect(
        factory.connect(admin).setTreasuryWallet(ethers.ZeroAddress)
      ).to.be.revertedWith("TokenFactory: Direccion de tesoreria invalida");
    });
  });

  describe("Mecanismo de Pausa de Emergencia", function () {
    it("13. Pausa y reanudación", async function () {
      await expect(factory.connect(admin).pause())
        .to.emit(factory, "FactoryPaused")
        .withArgs(true);

      // Mientras está pausado, createToken debe fallar con EnforcedPause
      await expect(
        factory.connect(user1).createToken(
          "Paused Token",
          "PAUS",
          18,
          1000,
          false,
          false,
          { value: INITIAL_FEE }
        )
      ).to.be.revertedWithCustomError(factory, "EnforcedPause");

      // Solo el admin puede reanudar
      await expect(factory.connect(admin).unpause())
        .to.emit(factory, "FactoryPaused")
        .withArgs(false);

      // Ahora createToken funciona normalmente
      await expect(
        factory.connect(user1).createToken(
          "Unpaused Token",
          "UNP",
          18,
          1000,
          false,
          false,
          { value: INITIAL_FEE }
        )
      ).to.not.be.reverted;
    });

    it("14. Una cuenta que NO sea el owner no puede ejecutar pause() ni unpause()", async function () {
      await expect(
        factory.connect(user1).pause()
      ).to.be.revertedWithCustomError(factory, "OwnableUnauthorizedAccount");

      // El admin pausa el contrato
      await factory.connect(admin).pause();

      // Una cuenta que no sea owner no puede reactivarlo
      await expect(
        factory.connect(user1).unpause()
      ).to.be.revertedWithCustomError(factory, "OwnableUnauthorizedAccount");
    });
  });

  describe("Validación de Parámetros de Creación", function () {
    it("16. Rechazo de nombre vacío y decimales > 18 propagando errores de StandardBEP20", async function () {
      // Intento de creación con nombre vacío
      await expect(
        factory.connect(user1).createToken(
          "",
          "SYM",
          18,
          1000,
          false,
          false,
          { value: INITIAL_FEE }
        )
      ).to.be.revertedWith("Token: El nombre no puede estar vacio");

      // Intento de creación con decimales mayores a 18
      await expect(
        factory.connect(user1).createToken(
          "Bad Decimals Token",
          "BDT",
          19,
          1000,
          false,
          false,
          { value: INITIAL_FEE }
        )
      ).to.be.revertedWith("Token: Decimales maximos permitidos son 18");
    });
  });

  describe("Seguridad contra Reentrancy", function () {
    it("17. Debe bloquear intentos de reentrancy durante el reembolso", async function () {
      const ReentrancyAttacker = await ethers.getContractFactory("ReentrancyAttacker");
      const attacker = await ReentrancyAttacker.deploy(factory.target);
      await attacker.waitForDeployment();

      // El atacante envía 0.05 ETH (> 0.02 fee) para activar el reembolso,
      // e intentará reingresar en su receive(). Debe fallar por nonReentrant.
      await expect(
        attacker.attack({ value: ethers.parseEther("0.05") })
      ).to.be.reverted;
    });
  });
});
