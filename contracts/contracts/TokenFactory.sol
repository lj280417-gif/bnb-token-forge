// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "./StandardBEP20.sol";

/**
 * @title TokenFactory
 * @dev Fábrica descentralizada para la creación de tokens BEP-20 en BNB Smart Chain.
 * Permite configurar una comisión de servicio (serviceFee) enviada a una tesorería,
 * asignando al usuario como propietario y receptor del 100% del suministro inicial.
 */
contract TokenFactory is Ownable, ReentrancyGuard, Pausable {
    uint256 public serviceFee;
    address payable public treasuryWallet;

    address[] private _allTokens;
    mapping(address => address[]) private _userTokens;

    event TokenCreated(
        address indexed tokenAddress,
        address indexed creator,
        string name,
        string symbol,
        uint8 decimals,
        uint256 initialSupply,
        bool canBurn,
        bool canMint,
        uint256 feePaid,
        uint256 timestamp
    );

    event ServiceFeeUpdated(uint256 oldFee, uint256 newFee);
    event TreasuryWalletUpdated(address indexed oldTreasury, address indexed newTreasury);
    event FactoryPaused(bool isPaused);

    /**
     * @dev Inicializa el contrato TokenFactory.
     * @param initialOwner_ Dirección del propietario/administrador del Factory
     * @param treasuryWallet_ Dirección donde se recibirán las comisiones de servicio
     * @param initialFee_ Comisión inicial en wei (tBNB / BNB)
     */
    constructor(
        address initialOwner_,
        address payable treasuryWallet_,
        uint256 initialFee_
    ) Ownable(initialOwner_) {
        require(treasuryWallet_ != address(0), "TokenFactory: Direccion de tesoreria invalida");
        treasuryWallet = treasuryWallet_;
        serviceFee = initialFee_;
    }

    /**
     * @dev Crea un nuevo token BEP-20.
     * Asigna al msg.sender como owner del nuevo token y receptor del suministro inicial.
     * Cobra la tarifa de servicio hacia la tesorería y reembolsa cualquier excedente enviado.
     */
    function createToken(
        string memory name,
        string memory symbol,
        uint8 decimals,
        uint256 initialSupply,
        bool canBurn,
        bool canMint
    ) external payable whenNotPaused nonReentrant returns (address) {
        require(msg.value >= serviceFee, "TokenFactory: Tarifa de servicio insuficiente");

        // 1. Despliegue de la nueva instancia de StandardBEP20 asignando a msg.sender como initialOwner
        StandardBEP20 newToken = new StandardBEP20(
            name,
            symbol,
            decimals,
            initialSupply,
            msg.sender,
            canBurn,
            canMint
        );

        address tokenAddress = address(newToken);

        // 2. Registro en el inventario global y por usuario
        _allTokens.push(tokenAddress);
        _userTokens[msg.sender].push(tokenAddress);

        // 3. Manejo de fondos (Checks-Effects-Interactions)
        uint256 feeToPay = serviceFee;
        uint256 refund = msg.value - feeToPay;

        if (feeToPay > 0) {
            (bool sentToTreasury, ) = treasuryWallet.call{value: feeToPay}("");
            require(sentToTreasury, "TokenFactory: Fallo al enviar comision a tesoreria");
        }

        if (refund > 0) {
            (bool refunded, ) = msg.sender.call{value: refund}("");
            require(refunded, "TokenFactory: Fallo al reembolsar excedente");
        }

        emit TokenCreated(
            tokenAddress,
            msg.sender,
            name,
            symbol,
            decimals,
            initialSupply,
            canBurn,
            canMint,
            feeToPay,
            block.timestamp
        );

        return tokenAddress;
    }

    /**
     * @dev Actualiza la comisión de servicio para crear tokens.
     * Solo puede ser llamado por el propietario del Factory.
     */
    function setServiceFee(uint256 newFee) external onlyOwner {
        uint256 oldFee = serviceFee;
        serviceFee = newFee;
        emit ServiceFeeUpdated(oldFee, newFee);
    }

    /**
     * @dev Actualiza la dirección de la billetera de tesorería.
     * Solo puede ser llamado por el propietario del Factory.
     */
    function setTreasuryWallet(address payable newTreasury) external onlyOwner {
        require(newTreasury != address(0), "TokenFactory: Direccion de tesoreria invalida");
        address oldTreasury = treasuryWallet;
        treasuryWallet = newTreasury;
        emit TreasuryWalletUpdated(oldTreasury, newTreasury);
    }

    /**
     * @dev Pausa de emergencia para suspender la creación de nuevos tokens.
     */
    function pause() external onlyOwner {
        _pause();
        emit FactoryPaused(true);
    }

    /**
     * @dev Reanuda la creación de tokens tras una pausa.
     */
    function unpause() external onlyOwner {
        _unpause();
        emit FactoryPaused(false);
    }

    /**
     * @dev Retorna la lista completa de direcciones de tokens creados por un usuario.
     */
    function getUserTokens(address user) external view returns (address[] memory) {
        return _userTokens[user];
    }

    /**
     * @dev Retorna la cantidad de tokens creados por un usuario.
     */
    function getUserTokensCount(address user) external view returns (uint256) {
        return _userTokens[user].length;
    }

    /**
     * @dev Retorna la lista global de todas las direcciones de tokens creados en la plataforma.
     */
    function getAllTokens() external view returns (address[] memory) {
        return _allTokens;
    }

    /**
     * @dev Retorna el número total de tokens creados a través de este Factory.
     */
    function getTokensCount() external view returns (uint256) {
        return _allTokens.length;
    }
}
