const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("StandardBEP20 Token Contract", function () {
  let Token;
  let token;
  let owner;
  let addr1;
  let addr2;

  const NAME = "Binance Nova";
  const SYMBOL = "BNOV";
  const DECIMALS = 18;
  const INITIAL_SUPPLY = 1000000; // 1 millón

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();
    Token = await ethers.getContractFactory("StandardBEP20");
    token = await Token.deploy(
      NAME,
      SYMBOL,
      DECIMALS,
      INITIAL_SUPPLY,
      owner.address,
      true, // canBurn = true
      true  // canMint = true
    );
    await token.waitForDeployment();
  });

  describe("Inicialización y Parámetros", function () {
    it("Debe configurar correctamente el nombre y el símbolo", async function () {
      expect(await token.name()).to.equal(NAME);
      expect(await token.symbol()).to.equal(SYMBOL);
    });

    it("Debe configurar los decimales especificados", async function () {
      expect(await token.decimals()).to.equal(DECIMALS);
    });

    it("Debe asignar el suministro total escalado al owner", async function () {
      const expectedSupply = ethers.parseUnits(INITIAL_SUPPLY.toString(), DECIMALS);
      expect(await token.totalSupply()).to.equal(expectedSupply);
      expect(await token.balanceOf(owner.address)).to.equal(expectedSupply);
    });

    it("Debe establecer al owner correcto", async function () {
      expect(await token.owner()).to.equal(owner.address);
    });

    it("Debe rechazar nombres o símbolos vacíos", async function () {
      await expect(
        Token.deploy("", SYMBOL, 18, 1000, owner.address, false, false)
      ).to.be.revertedWith("Token: El nombre no puede estar vacio");

      await expect(
        Token.deploy(NAME, "", 18, 1000, owner.address, false, false)
      ).to.be.revertedWith("Token: El simbolo no puede estar vacio");
    });

    it("Debe rechazar direcciones de owner inválidas (zero address)", async function () {
      await expect(
        Token.deploy(NAME, SYMBOL, 18, 1000, ethers.ZeroAddress, false, false)
      ).to.be.revertedWithCustomError(token, "OwnableInvalidOwner");
    });
  });

  describe("Transferencias", function () {
    it("Debe permitir transferencias correctas entre cuentas", async function () {
      const transferAmount = ethers.parseUnits("500", DECIMALS);
      await token.transfer(addr1.address, transferAmount);

      expect(await token.balanceOf(addr1.address)).to.equal(transferAmount);

      await token.connect(addr1).transfer(addr2.address, ethers.parseUnits("200", DECIMALS));
      expect(await token.balanceOf(addr2.address)).to.equal(ethers.parseUnits("200", DECIMALS));
      expect(await token.balanceOf(addr1.address)).to.equal(ethers.parseUnits("300", DECIMALS));
    });

    it("Debe fallar si el remitente no tiene suficientes fondos", async function () {
      const initialBalance = await token.balanceOf(addr1.address);
      expect(initialBalance).to.equal(0);
      await expect(
        token.connect(addr1).transfer(owner.address, ethers.parseUnits("1", DECIMALS))
      ).to.be.revertedWithCustomError(token, "ERC20InsufficientBalance");
    });
  });

  describe("Funcionalidad de Quema (Burnable)", function () {
    it("Debe permitir al poseedor quemar sus propios tokens cuando canBurn es true", async function () {
      const burnAmount = ethers.parseUnits("1000", DECIMALS);
      const initialSupply = await token.totalSupply();

      await expect(token.burn(burnAmount))
        .to.emit(token, "TokensBurned")
        .withArgs(owner.address, burnAmount);

      expect(await token.totalSupply()).to.equal(initialSupply - burnAmount);
    });

    it("Debe rechazar la quema si canBurn fue configurado en false", async function () {
      const nonBurnableToken = await Token.deploy(
        "No Burn",
        "NOB",
        18,
        1000,
        owner.address,
        false, // canBurn = false
        false
      );
      await nonBurnableToken.waitForDeployment();

      await expect(
        nonBurnableToken.burn(ethers.parseUnits("10", 18))
      ).to.be.revertedWith("Token: La quema de tokens no esta habilitada en este contrato");
    });
  });

  describe("Funcionalidad de Emisión Adicional (Mintable)", function () {
    it("Debe permitir solo al propietario emitir nuevos tokens si canMint es true", async function () {
      const mintAmount = ethers.parseUnits("5000", DECIMALS);
      await expect(token.mint(addr1.address, mintAmount))
        .to.emit(token, "TokensMinted")
        .withArgs(addr1.address, mintAmount);

      expect(await token.balanceOf(addr1.address)).to.equal(mintAmount);
    });

    it("Debe rechazar la emisión si la llama un usuario que no es owner", async function () {
      await expect(
        token.connect(addr1).mint(addr1.address, ethers.parseUnits("100", DECIMALS))
      ).to.be.revertedWithCustomError(token, "OwnableUnauthorizedAccount");
    });

    it("Debe rechazar la emisión si canMint fue configurado en false", async function () {
      const nonMintableToken = await Token.deploy(
        "No Mint",
        "NOM",
        18,
        1000,
        owner.address,
        true,
        false // canMint = false
      );
      await nonMintableToken.waitForDeployment();

      await expect(
        nonMintableToken.mint(owner.address, ethers.parseUnits("100", 18))
      ).to.be.revertedWith("Token: La emision de tokens no esta habilitada en este contrato");
    });
  });
});
